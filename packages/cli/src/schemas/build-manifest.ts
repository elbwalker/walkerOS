/**
 * Build Manifest Schemas
 *
 * The contract of `walkeros bundle --manifest`: a build orchestrator writes a
 * manifest, the CLI builds every requested artifact, PUTs each output to its
 * own URL, then PUTs a structured result to `resultPutUrl`. Any orchestrator
 * can drive it (a CI job, a hosted build job, a self-hoster's script); nothing
 * in it is specific to one.
 *
 * Evolution rule: unknown TOP-LEVEL keys are tolerated and ignored, so an
 * orchestrator can add a field for its own bookkeeping without a CLI release.
 * A field the CLI must ACT on needs a CLI release, and `toolchain` makes the
 * CLI refuse a manifest written for a different version rather than silently
 * ignoring what it does not understand. Artifact entries and wrap options are
 * strict for the same reason: an ignored option there would change the bytes.
 *
 * Build env: web `$env.NAME` resolves against `buildEnv` with the flow's
 * `config.bundle.env` on top (declared wins), never against the CLI process's
 * own environment. `config.bundle.env` values are taken as literals: a
 * reference inside one (`"$env.X"`) is not resolved at build time and must
 * not be relied on. A `$flow.<sibling>` reference resolves against the ENTRY
 * flow's declared env, never the sibling's own `config.bundle.env`, so a
 * value the sibling declares for itself is `MISSING_BUILD_ENV` here.
 *
 * Local paths: a manifest build refuses every config-chosen filesystem input
 * (local step packages, `bundle.packages.<name>.path`, `bundle.traceInclude`,
 * `include`) with `LOCAL_PATH_NOT_ALLOWED`, before anything is fetched.
 */

import { z } from '@walkeros/core/dev';
import type { BundleTarget } from '../commands/bundle/targets.js';
import type { WrapSkeletonOptions } from '../commands/bundle/wrap.js';

/** Current manifest format version. */
export const BUILD_MANIFEST_VERSION = 1;

const HttpUrlSchema = z.url({ protocol: /^https?$/ });

/**
 * A bare file name: the output is written inside the build's own temp dir, so
 * path separators and leading dots are refused.
 */
const OutputNameSchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'Must be a bare file name')
  .describe('Output file name; its extension picks the format (.tar.gz packs)');

const BUNDLE_TARGET_NAMES = [
  'cdn',
  'cdn-skeleton',
  'runner',
  'simulate',
  'push',
] as const satisfies ReadonlyArray<BundleTarget>;

// Compile-time completeness: a new BundleTarget fails here until listed.
type MissingTarget = Exclude<
  BundleTarget,
  (typeof BUNDLE_TARGET_NAMES)[number]
>;
const bundleTargetsComplete: [MissingTarget] extends [never] ? true : never =
  true;
void bundleTargetsComplete;

/** Header names the CLI sets itself and an artifact may not override. */
const RESERVED_HEADERS: ReadonlySet<string> = new Set([
  'content-type',
  'content-length',
  'host',
]);

const OutputFields = {
  outputName: OutputNameSchema,
  putUrl: HttpUrlSchema.describe('Presigned PUT for exactly this output'),
  contentType: z
    .string()
    .min(1)
    .optional()
    .describe('Content-Type sent with the PUT (must match a signed header)'),
  headers: z
    .record(z.string().min(1), z.string())
    .refine(
      (headers) =>
        Object.keys(headers).every(
          (name) => !RESERVED_HEADERS.has(name.toLowerCase()),
        ),
      'Content-Type, Content-Length and Host are set by the CLI',
    )
    .optional()
    .describe(
      'Extra headers sent with the PUT (for headers a presign signs); never logged',
    ),
};

export const BuildBundleArtifactSchema = z
  .object({
    target: z.enum(BUNDLE_TARGET_NAMES).describe('Named bundle target'),
    ...OutputFields,
  })
  .strict();

export const BuildWrapOptionsSchema = z
  .object({
    windowCollector: z.string().min(1).optional(),
    windowElb: z.string().min(1).optional(),
    preview: z
      .object({
        enabled: z.boolean(),
        keyring: z.array(
          z.object({ kid: z.string(), spki: z.string() }).strict(),
        ),
        iss: z.string(),
        pb: z.string().optional(),
        acceptForeign: z.boolean().optional(),
        demoAllowlist: z.array(z.string()).optional(),
        previewOrigin: z.string(),
      })
      .strict()
      .optional(),
    previewGrantTargets: z.array(z.string()).optional(),
    observe: z
      .object({
        url: z.string(),
        binding: z.string(),
        flowId: z.string().optional(),
        level: z.enum(['off', 'standard', 'trace']).optional(),
        sample: z.number().min(0).max(1).optional(),
      })
      .strict()
      .optional(),
    minify: z.boolean().optional(),
    minifyOptions: z
      .object({
        identifiers: z.boolean().optional(),
        syntax: z.boolean().optional(),
        whitespace: z.boolean().optional(),
        keepNames: z.boolean().optional(),
        legalComments: z
          .enum(['none', 'inline', 'eof', 'linked', 'external'])
          .optional(),
      })
      .strict()
      .optional(),
    target: z.string().min(1).optional().describe('esbuild target'),
  })
  .strict()
  .describe('Options forwarded to wrapSkeleton');

export const BuildWrapArtifactSchema = z
  .object({
    target: z.literal('wrap'),
    platform: z.enum(['browser', 'node']),
    skeleton: z
      .union([
        z.object({ url: HttpUrlSchema }).strict(),
        z.object({ artifact: OutputNameSchema }).strict(),
      ])
      .describe(
        'The skeleton to wrap: a GET URL, or the outputName of an earlier bundle artifact in this manifest',
      ),
    options: BuildWrapOptionsSchema.optional(),
    ...OutputFields,
  })
  .strict();

export const BuildArtifactSchema = z.union([
  BuildBundleArtifactSchema,
  BuildWrapArtifactSchema,
]);

export const BuildManifestSchema = z
  .object({
    version: z.literal(BUILD_MANIFEST_VERSION),
    toolchain: z
      .string()
      .min(1)
      .describe('Exact @walkeros/cli version; any other version refuses'),
    flowConfig: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Flow.Json to bundle; required when any bundle artifact is'),
    flowName: z.string().min(1).optional(),
    buildEnv: z
      .record(z.string(), z.string())
      .optional()
      .describe(
        "Base env for web $env, beneath config.bundle.env. Never the CLI process's own env",
      ),
    artifacts: z.array(BuildArtifactSchema).min(1),
    resultPutUrl: HttpUrlSchema.describe('Presigned PUT for the result JSON'),
  })
  .loose()
  .superRefine((manifest, ctx) => {
    const seen = new Set<string>();
    const bundled = new Set<string>();
    manifest.artifacts.forEach((artifact, index) => {
      if (seen.has(artifact.outputName)) {
        ctx.addIssue({
          code: 'custom',
          path: ['artifacts', index, 'outputName'],
          message: `Duplicate outputName "${artifact.outputName}"`,
        });
      }
      seen.add(artifact.outputName);
      if (artifact.target !== 'wrap') {
        bundled.add(artifact.outputName);
        if (!manifest.flowConfig) {
          ctx.addIssue({
            code: 'custom',
            path: ['flowConfig'],
            message: 'flowConfig is required for bundle artifacts',
          });
        }
      } else if (
        'artifact' in artifact.skeleton &&
        !bundled.has(artifact.skeleton.artifact)
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['artifacts', index, 'skeleton', 'artifact'],
          message: `No earlier bundle artifact named "${artifact.skeleton.artifact}"`,
        });
      }
    });
  })
  .meta({ id: 'BuildManifest', title: 'walkeros bundle --manifest input' });

export type BuildManifest = z.infer<typeof BuildManifestSchema>;
export type BuildArtifact = z.infer<typeof BuildArtifactSchema>;
export type BuildWrapOptions = z.infer<typeof BuildWrapOptionsSchema>;

// Compile-time, both directions: parsed wrap options must be accepted by
// wrapSkeleton, and every wrapSkeleton option except the three the command
// supplies itself must be reachable through the manifest.
const wrapOptionsFit = (
  options: BuildWrapOptions,
): Partial<WrapSkeletonOptions> => options;
void wrapOptionsFit;
type UnreachableWrapOption = Exclude<
  keyof WrapSkeletonOptions,
  keyof BuildWrapOptions | 'skeletonPath' | 'platform' | 'outputPath'
>;
const wrapOptionsComplete: [UnreachableWrapOption] extends [never]
  ? true
  : never = true;
void wrapOptionsComplete;

/**
 * Error codes a result can carry. User-config codes first, then build and
 * infrastructure codes.
 */
export const BUILD_ERROR_CODES = [
  'INVALID_MANIFEST',
  'TOOLCHAIN_MISMATCH',
  'INVALID_CONFIG',
  'MISSING_BUILD_ENV',
  'WEB_SECRET_REF',
  'UNSUPPORTED_PACKAGE_SPEC',
  'LOCAL_PATH_NOT_ALLOWED',
  'BUILD_FAILED',
  'UPLOAD_FAILED',
] as const;

export type BuildErrorCode = (typeof BUILD_ERROR_CODES)[number];

export const BuildResultSchema = z
  .object({
    ok: z.boolean(),
    toolchain: z.string().describe('The CLI version that ran the build'),
    artifacts: z
      .array(
        z.object({
          target: z.string(),
          outputName: z.string(),
          bytes: z.number().int().nonnegative(),
          sha256: z.string(),
        }),
      )
      .describe('Outputs PUT successfully, in manifest order'),
    error: z
      .object({
        code: z.enum(BUILD_ERROR_CODES),
        message: z.string(),
        outputName: z
          .string()
          .optional()
          .describe('The artifact being built when the error occurred'),
      })
      .optional(),
  })
  .meta({ id: 'BuildResult', title: 'walkeros bundle --manifest result' });

export type BuildResult = z.infer<typeof BuildResultSchema>;
