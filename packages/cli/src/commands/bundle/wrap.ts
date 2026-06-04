/**
 * Publish-time wrap step.
 *
 * Takes a Stage 1 ESM skeleton produced via `bundle({ skipWrapper: true })`
 * and produces a wrapped output:
 *  - `browser`: self-executing async IIFE that calls `wireConfig(__configData)`,
 *    injects `env.window` / `env.document` into every source, then calls
 *    `startFlow(config)` and optionally assigns the resulting collector/elb
 *    onto `window`.
 *  - `node`: ESM module whose default export is an async factory function
 *    that the runtime container (see `runtime/load-bundle.ts:53-66`) calls
 *    with a context to get back `{ collector, elb, httpHandler? }`.
 *
 * The skeleton must export `wireConfig`, `startFlow`, and `__configData`.
 * The skipWrapper branch of `bundleCore` already emits exactly that shape.
 */

import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import * as esbuild from 'esbuild';
import {
  generateWrapEntry,
  generateWrapEntryServer,
  getNodeExternals,
} from './bundler.js';
import type { MinifyOptions } from '../../types/bundle.js';

export interface WrapSkeletonOptions {
  /**
   * Absolute path to the Stage 1 skeleton ESM file. Must export
   * `wireConfig`, `startFlow`, and `__configData`.
   */
  skeletonPath: string;

  /** Target platform — controls which entry generator runs. */
  platform: 'browser' | 'node';

  /** Absolute path where the wrapped output will be written. */
  outputPath: string;

  /**
   * Browser-only: window property name for the collector.
   * When unset, no `window.*` assignment is emitted.
   */
  windowCollector?: string;

  /**
   * Browser-only: window property name for the elb function.
   * When unset, no `window.*` assignment is emitted.
   */
  windowElb?: string;

  /** Browser-only: CDN hostname for loading preview bundles. */
  previewOrigin?: string;
  /** Browser-only: project scope for preview URL isolation. */
  previewScope?: string;

  /**
   * Browser-only: telemetry wiring. When provided, the wrapped bundle
   * installs an observer built via `createTelemetryObserver` onto
   * `collector.observers` and forwards FlowState records to `observerUrl`
   * using `createBatchedPoster`.
   *
   * Omit (or pass `level: 'off'`) to ship a bundle with zero telemetry
   * plumbing.
   */
  telemetry?: TelemetryBundleOptions;

  /**
   * esbuild target. @default 'es2018' for browser, 'node18' for node.
   */
  target?: string;

  /** Whether to minify the output. @default true */
  minify?: boolean;

  /** Fine-grained minification options, forwarded to esbuild. */
  minifyOptions?: MinifyOptions;
}

export interface TelemetryBundleOptions {
  /** Absolute ingest URL. POST receives JSON array of FlowState. */
  observerUrl: string;
  /**
   * Full deployment-scoped trace endpoint, e.g.
   * `https://observer.example.com/trace/<deploymentId>`. Baked into the bundle
   * and polled verbatim; the browser never constructs it from a base.
   *
   * Optional: when omitted, the bundle wires the observer at a fixed `level`
   * with no polling. Suits short-lived, URL-opted-in sessions (e.g. a preview
   * at `level: 'trace'`).
   */
  traceUrl?: string;
  /** Deployment-scoped plaintext token. Sent as `Authorization: Bearer`. */
  ingestToken: string;
  /** Used as the `flowId` on every emitted FlowState. */
  flowId: string;
  /**
   * Baseline verbosity. Default 'standard'. Even an 'off' baseline is wired
   * (as a supplier) so the runtime trace poll can flip it to trace.
   */
  level?: 'off' | 'standard' | 'trace';
  /** Deterministic sample fraction in [0, 1]. Default 1. */
  sample?: number;
}

/**
 * Returns the candidate `node_modules` dirs esbuild should consult for
 * the wrap step's stage 2 entry. We start at this module's own location
 * and walk upward, since the wrap step always runs from inside the CLI
 * package — either via `node_modules/@walkeros/cli/dist/...` or directly
 * from the workspace source tree during tests.
 */
/**
 * Extracts the `<pkg>/dev` specifiers from a skeleton's lazy `__devExports`
 * registry by reading its literal `import('<pkg>/dev')` thunks. The registry is
 * the authoritative `/dev` list (it is codegen'd from the same `computeDevPackages`
 * set), so deriving the externals from the skeleton text cannot drift from it.
 * A skeleton with no registry (e.g. a `cdn`-shaped build) yields `[]`.
 */
export function extractDevExternals(skeletonText: string): string[] {
  const pattern = /import\(\s*['"]([^'"]+\/dev)['"]\s*\)/g;
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(skeletonText)) !== null) {
    found.add(match[1]);
  }
  return Array.from(found);
}

function getNodeResolutionPaths(): string[] {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates: string[] = [];
  let dir = here;
  // Walk up at most 8 levels looking for node_modules dirs.
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, 'node_modules');
    candidates.push(candidate);
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return candidates;
}

export async function wrapSkeleton(
  options: WrapSkeletonOptions,
): Promise<void> {
  const {
    skeletonPath,
    platform,
    outputPath,
    windowCollector,
    windowElb,
    target,
    minify = true,
    minifyOptions,
  } = options;

  if (
    options.previewScope &&
    !/^[a-zA-Z0-9_-]{1,64}$/.test(options.previewScope)
  ) {
    throw new Error(
      `Invalid previewScope "${options.previewScope}". Must match /^[a-zA-Z0-9_-]{1,64}$/.`,
    );
  }
  if (options.previewOrigin && !/^[a-z0-9.-]+$/.test(options.previewOrigin)) {
    throw new Error(
      `Invalid previewOrigin "${options.previewOrigin}". Must be a bare hostname matching /^[a-z0-9.-]+$/.`,
    );
  }

  if (!(await fs.pathExists(skeletonPath))) {
    throw new Error(`wrapSkeleton: skeleton not found at ${skeletonPath}`);
  }

  const absoluteSkeletonPath = path.resolve(skeletonPath);

  // The skeleton's lazy `__devExports` registry carries literal
  // `import('<pkg>/dev')` thunks. The browser wrap inlines step packages, so
  // without externalizing `<pkg>/dev` esbuild would resolve those literals while
  // building the graph: it errors in a lean install where `<pkg>/dev` is absent,
  // or inlines the /dev graph (a deploy-purity violation) where it resolves.
  // Externalizing them makes the wrap skip resolution and lets DCE drop the
  // unreferenced registry. A `cdn`-shaped skeleton has no registry, so this is [].
  const skeletonText = await fs.readFile(absoluteSkeletonPath, 'utf-8');
  const devExternals = extractDevExternals(skeletonText);

  // Normalize the telemetry options for the entry generator. Telemetry is
  // wired whenever an ingest token exists, even for an 'off' baseline: the
  // observer is a supplier and the runtime trace poll can flip 'off' to trace.
  const tInput = options.telemetry;
  const tLevel = tInput?.level ?? 'standard';
  const telemetry = tInput
    ? {
        observerUrl: tInput.observerUrl,
        ingestToken: tInput.ingestToken,
        flowId: tInput.flowId,
        level: tLevel,
        ...(tInput.traceUrl !== undefined ? { traceUrl: tInput.traceUrl } : {}),
        ...(tInput.sample !== undefined ? { sample: tInput.sample } : {}),
      }
    : undefined;

  // Stage 2 entry imports from the skeleton via an absolute path.
  const entryText =
    platform === 'browser'
      ? generateWrapEntry(absoluteSkeletonPath, {
          ...(windowCollector ? { windowCollector } : {}),
          ...(windowElb ? { windowElb } : {}),
          ...(options.previewOrigin
            ? { previewOrigin: options.previewOrigin }
            : {}),
          ...(options.previewScope
            ? { previewScope: options.previewScope }
            : {}),
          platform,
          ...(telemetry ? { telemetry } : {}),
        })
      : generateWrapEntryServer(absoluteSkeletonPath);

  // Write the entry to its own temp dir so the caller's outputPath isn't
  // polluted with intermediate files.
  const entryDir = await fs.mkdtemp(path.join(os.tmpdir(), 'walkeros-wrap-'));
  const entryPath = path.join(entryDir, 'flow.mjs');

  try {
    await fs.writeFile(entryPath, entryText);
    await fs.ensureDir(path.dirname(outputPath));

    const esbuildOptions: esbuild.BuildOptions = {
      entryPoints: [entryPath],
      bundle: true,
      format: 'esm',
      platform,
      outfile: outputPath,
      // Resolve `@walkeros/core` (used by the telemetry block) from the CLI
      // package's own dependency tree and the workspace root. Without this,
      // esbuild looks under the temp entryDir which has no node_modules.
      // The wrap step always runs from inside the CLI process; both the
      // CLI's local node_modules and the workspace root are safe anchors.
      nodePaths: getNodeResolutionPaths(),
      treeShaking: true,
      logLevel: 'error',
      minify,
      ...(minify && {
        minifyWhitespace: minifyOptions?.whitespace ?? true,
        minifyIdentifiers: minifyOptions?.identifiers ?? true,
        minifySyntax: minifyOptions?.syntax ?? true,
        legalComments: minifyOptions?.legalComments ?? 'none',
        charset: 'utf8' as const,
      }),
    };

    if (platform === 'browser') {
      esbuildOptions.define = {
        'process.env.NODE_ENV': '"production"',
        global: 'globalThis',
      };
      // Externalize `<pkg>/dev` so the wrap skips resolving the lazy registry's
      // literals and DCE drops the unreferenced registry (see above). The node
      // branch needs no equivalent: it inlines step packages and tree-shakes the
      // unreferenced registry away without re-inlining the /dev graph (verified).
      esbuildOptions.external = devExternals;
      esbuildOptions.target = target ?? 'es2018';
    } else {
      // Match bundler.ts Stage 2 node config: externalize Node builtins,
      // prepend a createRequire banner so CommonJS deps keep working inside
      // an ESM wrapper.
      esbuildOptions.external = getNodeExternals();
      esbuildOptions.banner = {
        js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`,
      };
      esbuildOptions.target = target ?? 'node18';
    }

    await esbuild.build(esbuildOptions);
  } finally {
    await fs.remove(entryDir).catch(() => {});
  }
}
