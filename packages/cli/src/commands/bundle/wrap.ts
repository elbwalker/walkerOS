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
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import * as esbuild from 'esbuild';
import {
  cliPackagesPlugin,
  generateWrapEntry,
  generateWrapEntryServer,
  getNodeExternals,
} from './bundler.js';
import type { MoinTarget } from '@walkeros/core';
import { tmpRunDir } from '../../core/tmp-names.js';
import { buildFlagDefines, readNeedsMarker } from './build-flags.js';
import type { WrapEntryObserve, WrapEntryPreview } from './bundler.js';
import type { MinifyOptions } from '../../types/bundle.js';
import {
  BuildWrapObserveSchema,
  OBSERVE_NOT_ON_NODE,
  OBSERVE_NOT_WITH_PREVIEW,
} from '../../schemas/build-manifest.js';

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

  /**
   * Browser-only: preview activation wiring. Only host (deploy) wraps set
   * this; the preview-artifact wrap always omits it, per the anti-recursion
   * invariant in `generateWrapEntry`.
   */
  preview?: WrapEntryPreview;

  /**
   * Browser-only: Observe preview reporting, the preview route and its token.
   * Present, it replaces the flow's own `collector.observe` and turns the
   * reporter on; absent, the build carries no reporter. A node wrap refuses
   * it: a server flow reads `collector.observe` from its own config.
   */
  observe?: WrapEntryObserve;

  /**
   * Browser-only: the Tag Mode loader target, internal deploy data the stage
   * app passes like the preview keyring. Absent, the loader trusts the
   * production app.
   */
  moin?: MoinTarget;

  /**
   * esbuild target. @default 'es2018' for browser, 'node18' for node.
   */
  target?: string;

  /** Whether to minify the output. @default true */
  minify?: boolean;

  /** Fine-grained minification options, forwarded to esbuild. */
  minifyOptions?: MinifyOptions;
}

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

/**
 * Returns the candidate `node_modules` dirs esbuild should consult for
 * the wrap step's stage 2 entry. We start at this module's own location
 * and walk upward, since the wrap step always runs from inside the CLI
 * package: either via `node_modules/@walkeros/cli/dist/...` or directly
 * from the workspace source tree during tests.
 */
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

/**
 * Why a wrap cannot bake an `observe` option, or undefined when it can. A
 * direct caller skips the manifest, so the wrap parses the option with the
 * manifest's own schema. The message names keys only: the option's values
 * carry a token.
 */
export function observeProblem(
  observe: unknown,
  wrap: { platform: WrapSkeletonOptions['platform']; preview: boolean },
): string | undefined {
  if (wrap.platform !== 'browser') return OBSERVE_NOT_ON_NODE;
  if (wrap.preview) return OBSERVE_NOT_WITH_PREVIEW;
  const parsed = BuildWrapObserveSchema.safeParse(observe);
  if (parsed.success) return undefined;
  const issue = parsed.error.issues[0];
  const at = ['observe', ...(issue?.path ?? []).map(String)].join('.');
  return `Invalid ${at}: ${issue?.message ?? 'not an observe option'}`;
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

  // previewOrigin is non-optional on WrapEntryPreview: an empty string is
  // still a config error (it bakes a broken `https:///preview/<art>.js` URL
  // into the bundle), so it must fail the same charset check as a malformed
  // hostname rather than short-circuit past it via falsy-string skip.
  // The typeof gate matters despite the `string` type: an untyped JS/JSON
  // caller can pass undefined, and RegExp.test coerces it to the string
  // "undefined", which MATCHES the hostname charset and would bake
  // `https://undefined/preview/…` into the bundle.
  if (
    options.preview &&
    (typeof options.preview.previewOrigin !== 'string' ||
      !/^[a-z0-9.-]+$/.test(options.preview.previewOrigin))
  ) {
    throw new Error(
      `Invalid previewOrigin "${options.preview.previewOrigin}". Must be a bare hostname matching /^[a-z0-9.-]+$/.`,
    );
  }

  if (options.observe !== undefined) {
    const problem = observeProblem(options.observe, {
      platform,
      preview: options.preview !== undefined,
    });
    if (problem) throw new Error(problem);
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

  // Stage 2 entry imports from the skeleton via an absolute path.
  const entryText =
    platform === 'browser'
      ? generateWrapEntry(absoluteSkeletonPath, {
          ...(windowCollector ? { windowCollector } : {}),
          ...(windowElb ? { windowElb } : {}),
          ...(options.preview ? { preview: options.preview } : {}),
          ...(options.observe ? { observe: options.observe } : {}),
          platform,
          ...(options.moin ? { moin: options.moin } : {}),
        })
      : generateWrapEntryServer(absoluteSkeletonPath);

  // Write the entry to its own temp dir so the caller's outputPath isn't
  // polluted with intermediate files.
  const entryDir = await tmpRunDir('wrap');
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
      // Resolve `@walkeros/web-core` (the Tag Mode loader and the preview
      // activator) from the CLI package's own dependency tree and the
      // workspace root. Without this, esbuild looks under the temp entryDir
      // which has no node_modules. The wrap step always runs from inside the
      // CLI process; both the CLI's local node_modules and the workspace root
      // are safe anchors.
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
      // Emit the final browser artifact as an IIFE. The deployed bundle is
      // served as a classic <script> at global scope, so an ESM body would leak
      // its minified top-level declarations (e.g. `ga`) onto `window` and
      // collide with globals like Google Analytics. The IIFE wraps everything
      // in a private closure; the intentional `window.elb`/`window.walkerOS`
      // assignments live inside the entry's own async IIFE and reference
      // `window` explicitly, so they still run. The entry has zero exports, so
      // no `globalName` is needed.
      esbuildOptions.format = 'iife';
      // The entry's web-core imports (the Tag Mode loader, the preview
      // activator) come from the CLI's own web-core, never from a copy above
      // the temp dir.
      esbuildOptions.plugins = [cliPackagesPlugin()];
      // Build flags from the needs the skeleton carries; the reporter only
      // in a wrap given `observe` (see build-flags.ts).
      esbuildOptions.define = {
        'process.env.NODE_ENV': '"production"',
        global: 'globalThis',
        ...buildFlagDefines(
          readNeedsMarker(skeletonText),
          options.observe !== undefined,
        ),
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
