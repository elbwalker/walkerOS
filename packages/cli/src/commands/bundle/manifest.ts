/**
 * `walkeros bundle --manifest <source>`: build from a manifest.
 *
 * Fetches a manifest (see `schemas/build-manifest.ts`), refuses it unless its
 * `toolchain` is this CLI's exact version, builds each artifact in order,
 * PUTs every output to its own URL, and finally PUTs a structured result to
 * `resultPutUrl`. Web `$env` resolves against `manifest.buildEnv` plus the
 * flow's `config.bundle.env`, never against this process's environment.
 *
 * Messages are written for the orchestrator to show a user, so they never
 * carry a URL query string (presigned credentials live there).
 */

import crypto from 'crypto';
import path from 'path';
import fs from 'fs-extra';
import { FlowReferenceError } from '@walkeros/core';
import { getErrorMessage } from '../../core/index.js';
import { createCLILogger } from '../../core/cli-logger.js';
import { UnsupportedPackageSpecError } from '../../core/package-spec.js';
import { loadBundleConfig, type LoadConfigResult } from '../../config/index.js';
import { tmpRunDir } from '../../core/tmp-names.js';
import { VERSION } from '../../version.js';
import {
  BuildManifestSchema,
  type BuildArtifact,
  type BuildErrorCode,
  type BuildManifest,
  type BuildResult,
} from '../../schemas/build-manifest.js';
import { bundle } from './index.js';
import { includeApplies } from './bundler.js';
import { wrapSkeleton } from './wrap.js';
import { sanitizeUrl } from './upload.js';

/** Env var a bare `--manifest` reads its source from. */
export const BUILD_MANIFEST_ENV = 'BUILD_MANIFEST_URL';

class BuildError extends Error {
  constructor(
    readonly code: BuildErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BuildError';
  }
}

const STEP_SECTIONS = [
  'sources',
  'destinations',
  'transformers',
  'stores',
] as const;

/**
 * A manifest build refuses every config-chosen filesystem path: local step
 * packages (`.` or `/` prefixed), `bundle.packages.<name>.path`,
 * `bundle.traceInclude` and, for a server build, `include`. On a laptop
 * those read the user's own disk; in a build job they would read the job's
 * filesystem into the artifact. Checked
 * on the RESOLVED flow, so a `$var` cannot smuggle a path past it. The
 * message names locations only, never the path values.
 */
function assertNoLocalPaths(loaded: LoadConfigResult): void {
  const locations: string[] = [];
  for (const [name, pkg] of Object.entries(loaded.buildOptions.packages)) {
    if (pkg.path !== undefined) {
      locations.push(`config.bundle.packages.${name}.path`);
    }
  }
  if (loaded.buildOptions.traceInclude?.length) {
    locations.push('config.bundle.traceInclude');
  }
  // The default `./shared` probe resolves inside the empty work dir, so a
  // non-empty list here always came from the config's own `include`. A web
  // build never reads it, so it is refused only where it applies.
  if (
    loaded.buildOptions.include?.length &&
    includeApplies(loaded.buildOptions)
  ) {
    locations.push('include');
  }
  for (const section of STEP_SECTIONS) {
    for (const [id, step] of Object.entries(
      loaded.flowSettings[section] ?? {},
    )) {
      const pkg = step.package;
      if (
        typeof pkg === 'string' &&
        (pkg.startsWith('.') || pkg.startsWith('/'))
      ) {
        locations.push(`${section}.${id}.package`);
      }
    }
  }
  if (locations.length > 0) {
    throw new BuildError(
      'LOCAL_PATH_NOT_ALLOWED',
      `Local filesystem paths are not allowed in a manifest build: ${locations.join(', ')}`,
    );
  }
}

/** Map an error thrown while loading or building to a result code. */
function classify(error: unknown, phase: 'config' | 'build'): BuildErrorCode {
  if (error instanceof BuildError) return error.code;
  if (error instanceof FlowReferenceError) {
    return error.code === 'MISSING_ENV'
      ? 'MISSING_BUILD_ENV'
      : 'WEB_SECRET_REF';
  }
  if (error instanceof UnsupportedPackageSpecError) {
    return 'UNSUPPORTED_PACKAGE_SPEC';
  }
  return phase === 'config' ? 'INVALID_CONFIG' : 'BUILD_FAILED';
}

function isHttpUrl(source: string): boolean {
  return source.startsWith('http://') || source.startsWith('https://');
}

async function readManifestSource(source: string): Promise<unknown> {
  let text: string;
  if (isHttpUrl(source)) {
    const response = await fetch(source, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(
        `Manifest fetch failed: ${response.status} ${sanitizeUrl(source)}`,
      );
    }
    text = await response.text();
  } else {
    text = await fs.readFile(source, 'utf-8');
  }
  return JSON.parse(text);
}

/** Default Content-Type for an output, from its name. */
function contentTypeFor(outputName: string): string {
  const lower = outputName.toLowerCase();
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
    return 'application/gzip';
  }
  return 'application/javascript';
}

async function put(
  url: string,
  body: BodyInit,
  contentType: string,
  headers: Record<string, string> = {},
): Promise<void> {
  // Header values are never logged: a presign may sign secrets into them.
  // A network-level failure (reset, DNS, timeout) is retried once like a 5xx
  // and reported as UPLOAD_FAILED, never as a build failure.
  const attempt = async (): Promise<Response | undefined> => {
    try {
      return await fetch(url, {
        method: 'PUT',
        body,
        headers: { ...headers, 'Content-Type': contentType },
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      return undefined;
    }
  };
  let response = await attempt();
  if (!response || response.status >= 500) response = await attempt();
  if (!response || !response.ok) {
    throw new BuildError(
      'UPLOAD_FAILED',
      `Upload failed: ${response ? response.status : 'network error'} ${sanitizeUrl(url)}`,
    );
  }
}

async function download(url: string, dest: string): Promise<void> {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) {
    throw new BuildError(
      'BUILD_FAILED',
      `Skeleton fetch failed: ${response.status} ${sanitizeUrl(url)}`,
    );
  }
  await fs.writeFile(dest, Buffer.from(await response.arrayBuffer()));
}

async function buildArtifact(
  manifest: BuildManifest,
  configPath: string,
  artifact: BuildArtifact,
  workDir: string,
  index: number,
  outputs: Map<string, string>,
): Promise<string> {
  const output = path.join(workDir, 'out', artifact.outputName);
  await fs.ensureDir(path.dirname(output));

  if (artifact.target === 'wrap') {
    let skeletonPath: string;
    if ('url' in artifact.skeleton) {
      skeletonPath = path.join(workDir, `skeleton-${index}.mjs`);
      await download(artifact.skeleton.url, skeletonPath);
    } else {
      // Schema guarantees an earlier bundle artifact with this name.
      const built = outputs.get(artifact.skeleton.artifact);
      if (!built) {
        throw new BuildError(
          'INVALID_MANIFEST',
          `No built artifact named "${artifact.skeleton.artifact}"`,
        );
      }
      skeletonPath = built;
    }
    await wrapSkeleton({
      skeletonPath,
      platform: artifact.platform,
      outputPath: output,
      ...artifact.options,
    });
    return output;
  }

  const scratch = path.join(workDir, `cli-${index}`);
  await fs.ensureDir(scratch);
  // A config FILE inside the empty work dir, so includes and relative paths
  // resolve there and never against whatever directory the CLI runs in.
  await bundle(configPath, {
    ...(manifest.flowName ? { flowName: manifest.flowName } : {}),
    target: artifact.target,
    silent: true,
    // Each build starts clean: the build cache would hold inlined values.
    cache: false,
    // The base env is the manifest's, NEVER this process's own.
    buildEnv: manifest.buildEnv ?? {},
    buildOverrides: { output, tempDir: scratch },
  });
  return output;
}

export interface RunBuildManifestResult {
  result: BuildResult;
  /** False when the result could not be PUT (or the manifest was unreadable). */
  reported: boolean;
}

/**
 * Run a manifest build end to end. Never throws: every failure becomes a
 * result, and `reported` says whether that result reached `resultPutUrl`.
 */
export async function runBuildManifest(
  source: string,
): Promise<RunBuildManifestResult> {
  const result: BuildResult = { ok: false, toolchain: VERSION, artifacts: [] };
  const fail = (code: BuildErrorCode, message: string, outputName?: string) => {
    result.error = outputName
      ? { code, message, outputName }
      : { code, message };
  };

  let raw: unknown;
  try {
    raw = await readManifestSource(source);
  } catch (error) {
    fail('INVALID_MANIFEST', getErrorMessage(error));
    return { result, reported: false };
  }

  const parsed = BuildManifestSchema.safeParse(raw);
  if (!parsed.success) {
    fail(
      'INVALID_MANIFEST',
      parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; '),
    );
    // Report to the result URL when it is at least readable.
    const resultPutUrl = BuildManifestSchema.shape.resultPutUrl.safeParse(
      typeof raw === 'object' && raw !== null && 'resultPutUrl' in raw
        ? raw.resultPutUrl
        : undefined,
    );
    if (!resultPutUrl.success) return { result, reported: false };
    return { result, reported: await report(resultPutUrl.data, result) };
  }
  const manifest = parsed.data;

  if (manifest.toolchain !== VERSION) {
    fail(
      'TOOLCHAIN_MISMATCH',
      `Manifest expects @walkeros/cli ${manifest.toolchain}, this is ${VERSION}`,
    );
    return { result, reported: await report(manifest.resultPutUrl, result) };
  }

  const workDir = await tmpRunDir('build');
  try {
    // Load once up front so a config error is reported as one, before any
    // package is fetched.
    const configPath = path.join(workDir, 'flow.json');
    if (manifest.flowConfig) {
      try {
        await fs.writeJson(configPath, manifest.flowConfig);
        const loaded = loadBundleConfig(manifest.flowConfig, {
          configPath,
          flowName: manifest.flowName,
          buildEnv: manifest.buildEnv ?? {},
        });
        assertNoLocalPaths(loaded);
      } catch (error) {
        fail(classify(error, 'config'), getErrorMessage(error));
        return {
          result,
          reported: await report(manifest.resultPutUrl, result),
        };
      }
    }

    const outputs = new Map<string, string>();
    for (const [index, artifact] of manifest.artifacts.entries()) {
      try {
        const output = await buildArtifact(
          manifest,
          configPath,
          artifact,
          workDir,
          index,
          outputs,
        );
        outputs.set(artifact.outputName, output);
        const content = await fs.readFile(output);
        await put(
          artifact.putUrl,
          content,
          artifact.contentType ?? contentTypeFor(artifact.outputName),
          artifact.headers,
        );
        result.artifacts.push({
          target: artifact.target,
          outputName: artifact.outputName,
          bytes: content.length,
          sha256: crypto.createHash('sha256').update(content).digest('hex'),
        });
      } catch (error) {
        fail(
          classify(error, 'build'),
          getErrorMessage(error),
          artifact.outputName,
        );
        return {
          result,
          reported: await report(manifest.resultPutUrl, result),
        };
      }
    }

    result.ok = true;
    return { result, reported: await report(manifest.resultPutUrl, result) };
  } finally {
    await fs.remove(workDir).catch(() => {});
  }
}

async function report(url: string, result: BuildResult): Promise<boolean> {
  try {
    await put(url, JSON.stringify(result), 'application/json');
    return true;
  } catch {
    return false;
  }
}

export interface BundleManifestCommandOptions {
  /** Manifest URL or file path; `true` (bare flag) reads BUILD_MANIFEST_URL. */
  manifest: string | true;
  json?: boolean;
  verbose?: boolean;
  silent?: boolean;
}

const MANIFEST_FLAGS: ReadonlySet<string> = new Set([
  'manifest',
  'json',
  'verbose',
  'silent',
]);

/**
 * Inputs `--manifest` would silently ignore, as flag names. The manifest
 * carries the whole build, so any of them is a usage error. `cache` is
 * commander's `--no-cache` default (true) and only counts when switched off.
 */
export function manifestFlagConflicts(
  file: string | undefined,
  options: Record<string, unknown>,
): string[] {
  const conflicts = file ? ['a config file'] : [];
  for (const [key, value] of Object.entries(options)) {
    if (MANIFEST_FLAGS.has(key) || value === undefined) continue;
    if (key === 'cache' && value === true) continue;
    conflicts.push(key === 'cache' ? '--no-cache' : `--${key}`);
  }
  return conflicts;
}

/** Resolve the `--manifest` value, falling back to the env for a bare flag. */
export function resolveManifestSource(
  manifest: string | true,
  env: Record<string, string | undefined> = process.env,
): string {
  if (manifest !== true) return manifest;
  const fromEnv = env[BUILD_MANIFEST_ENV];
  if (!fromEnv) {
    throw new Error(
      `--manifest needs a URL or path, or ${BUILD_MANIFEST_ENV} in the environment`,
    );
  }
  return fromEnv;
}

export async function bundleManifestCommand(
  options: BundleManifestCommandOptions,
): Promise<void> {
  const logger = createCLILogger({ ...options, stderr: true });
  let source: string;
  try {
    source = resolveManifestSource(options.manifest);
  } catch (error) {
    logger.error(`Error: ${getErrorMessage(error)}`);
    process.exit(1);
  }

  const { result, reported } = await runBuildManifest(source);

  if (options.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else if (result.ok) {
    for (const artifact of result.artifacts) {
      logger.info(
        `Built ${artifact.outputName} (${artifact.target}, ${artifact.bytes} bytes)`,
      );
    }
  } else if (result.error) {
    logger.error(`Error [${result.error.code}]: ${result.error.message}`);
  }
  if (!reported) logger.error('Result could not be reported');

  process.exit(result.ok && reported ? 0 : 1);
}
