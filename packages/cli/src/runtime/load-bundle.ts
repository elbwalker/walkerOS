/**
 * Shared bundle-loading utility.
 *
 * Extracts the common pattern from push/index.ts (executeServerPush) and
 * runtime/runner.ts (loadFlow):
 *   1. Resolve path to absolute
 *   2. Convert to file URL with cache bust
 *   3. Dynamic import
 *   4. Validate default export is a function
 *   5. Call factory with context
 *   6. Validate result has collector with push function
 *   7. Return { collector, httpHandler? }
 */

import { resolve } from 'path';
import { pathToFileURL } from 'url';
import type { Logger } from '@walkeros/core';

export interface BundleResult {
  collector: {
    push: (...args: unknown[]) => Promise<unknown>;
    command: (...args: unknown[]) => Promise<unknown>;
    status?: unknown;
    sources?: Record<string, unknown>;
    [key: string]: unknown;
  };
  httpHandler?: (req: unknown, res: unknown) => void;
}

/**
 * Load a pre-built bundle, call its default factory, and return the result.
 *
 * Callers are responsible for:
 * - Setting process.cwd() before calling (runner.ts does `process.chdir`)
 * - Wrapping with a timeout if needed (push/index.ts uses Promise.race)
 *
 * @param file    - Path to the .mjs bundle (relative or absolute)
 * @param context - Context object passed to the factory function
 * @param logger  - Optional logger for debug messages
 */
export async function loadBundle(
  file: string,
  context?: Record<string, unknown>,
  logger?: Logger.Instance,
): Promise<BundleResult> {
  const absolutePath = resolve(file);
  // Node's runtime import() accepts file:// URLs per ESM spec. This is
  // distinct from paths emitted into source for esbuild bundling — for
  // that, use core/import-specifier.ts (esbuild does not resolve file://).
  const fileUrl = pathToFileURL(absolutePath).href;

  // Bust Node.js module cache by appending a query param
  logger?.debug?.(`Importing bundle: ${absolutePath}`);
  const module = await import(`${fileUrl}?t=${Date.now()}`);

  if (!module.default || typeof module.default !== 'function') {
    throw new Error(
      `Invalid bundle: ${file} must export a default factory function`,
    );
  }

  logger?.debug?.('Calling factory function...');
  const result = await module.default(context ?? {});

  if (
    !result ||
    !result.collector ||
    typeof result.collector.push !== 'function'
  ) {
    throw new Error(
      `Invalid bundle: factory must return { collector } with a push function`,
    );
  }

  return {
    collector: result.collector,
    ...(typeof result.httpHandler === 'function'
      ? { httpHandler: result.httpHandler }
      : {}),
  };
}
