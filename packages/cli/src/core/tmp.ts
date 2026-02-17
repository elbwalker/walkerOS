/**
 * Unified Temporary Directory Utility
 *
 * Single source of truth for all temp paths in the CLI.
 * All temp files go to ./.tmp/ relative to current working directory.
 */

import path from 'path';

const DEFAULT_TMP_ROOT = '.tmp';

/**
 * Get a path within the temp directory.
 *
 * @param tmpDir - Custom temp directory (optional, for --tmp-dir flag)
 * @param segments - Path segments to join
 * @returns Absolute path within temp directory
 *
 * @example
 * ```typescript
 * getTmpPath()                           // → "/cwd/.tmp"
 * getTmpPath(undefined, 'entry.js')      // → "/cwd/.tmp/entry.js"
 * getTmpPath(undefined, 'cache', 'builds') // → "/cwd/.tmp/cache/builds"
 * getTmpPath('/custom', 'cache')         // → "/custom/cache"
 * ```
 */
export function getTmpPath(tmpDir?: string, ...segments: string[]): string {
  const root = tmpDir || DEFAULT_TMP_ROOT;
  // Always return absolute path (esbuild requirement)
  const absoluteRoot = path.isAbsolute(root) ? root : path.resolve(root);
  return path.join(absoluteRoot, ...segments);
}

/**
 * Create a temp path resolver with the root directory baked in.
 *
 * Use this at entry points to capture the temp root once, then pass
 * the resolver to downstream functions. This prevents the class of bugs
 * where callers forget to pass tmpDir.
 *
 * @param tmpDir - Custom temp directory (optional, defaults to '.tmp')
 * @returns A function that resolves paths within the temp directory
 *
 * @example
 * ```typescript
 * const tmp = createTmpResolver(buildOptions.tempDir);
 * const cacheDir = tmp('cache', 'packages');  // root is baked in
 * ```
 */
export type TmpResolver = (...segments: string[]) => string;

export function createTmpResolver(tmpDir?: string): TmpResolver {
  const root = tmpDir || DEFAULT_TMP_ROOT;
  const absoluteRoot = path.isAbsolute(root) ? root : path.resolve(root);
  return (...segments: string[]) => path.join(absoluteRoot, ...segments);
}

/**
 * Get the default temp root directory.
 */
export function getDefaultTmpRoot(): string {
  return DEFAULT_TMP_ROOT;
}
