/**
 * Publish-time wrap step.
 *
 * Takes a Stage 1 ESM skeleton produced via `bundle({ skipWrapper: true })`
 * and produces a wrapped output:
 *  - `browser`: self-executing async IIFE that calls
 *    `startFlow(wireConfig(__configData))` and optionally assigns the
 *    resulting collector/elb onto `window`.
 *  - `node`: ESM module whose default export is an async factory function
 *    that the runtime container (see `runtime/load-bundle.ts:53-66`) calls
 *    with a context to get back `{ collector, elb, httpHandler? }`.
 *
 * The skeleton must export `wireConfig`, `startFlow`, and `__configData`.
 * The skipWrapper branch of `bundleCore` already emits exactly that shape.
 */

import * as path from 'path';
import * as os from 'os';
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

  /**
   * esbuild target. @default 'es2018' for browser, 'node18' for node.
   */
  target?: string;

  /** Whether to minify the output. @default true */
  minify?: boolean;

  /** Fine-grained minification options, forwarded to esbuild. */
  minifyOptions?: MinifyOptions;
}

export async function wrapSkeleton(options: WrapSkeletonOptions): Promise<void> {
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

  if (!(await fs.pathExists(skeletonPath))) {
    throw new Error(`wrapSkeleton: skeleton not found at ${skeletonPath}`);
  }

  const absoluteSkeletonPath = path.resolve(skeletonPath);

  // Stage 2 entry imports from the skeleton via an absolute path.
  const entryText =
    platform === 'browser'
      ? generateWrapEntry(absoluteSkeletonPath, {
          ...(windowCollector ? { windowCollector } : {}),
          ...(windowElb ? { windowElb } : {}),
        })
      : generateWrapEntryServer(absoluteSkeletonPath);

  // Write the entry to its own temp dir so the caller's outputPath isn't
  // polluted with intermediate files.
  const entryDir = await fs.mkdtemp(path.join(os.tmpdir(), 'walkeros-wrap-'));
  const entryPath = path.join(entryDir, 'entry.mjs');

  try {
    await fs.writeFile(entryPath, entryText);
    await fs.ensureDir(path.dirname(outputPath));

    const esbuildOptions: esbuild.BuildOptions = {
      entryPoints: [entryPath],
      bundle: true,
      format: 'esm',
      platform,
      outfile: outputPath,
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
