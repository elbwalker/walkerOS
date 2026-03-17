/**
 * Resolve bundle input to a local file path
 *
 * Priority order:
 * 1. File path (exists) - BUNDLE points to an existing local file
 * 2. URL                - BUNDLE is an http(s) URL → fetch and write to disk
 * 3. Stdin              - data piped into the process
 * 4. File path (fallback) - BUNDLE path that doesn't exist yet
 */

import { existsSync, writeFileSync } from 'fs';
import { isStdinPiped, readStdin } from '../core/stdin.js';

const TEMP_BUNDLE_PATH = '/tmp/walkeros-bundle.mjs';

export type BundleSource = 'stdin' | 'url' | 'file';

export interface ResolvedBundle {
  /** Absolute file path to the bundle (ready for import()) */
  path: string;
  /** How the bundle was provided */
  source: BundleSource;
}

/**
 * Detect whether a string is an HTTP(S) URL
 */
function isUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

/**
 * Fetch bundle from URL and write to temp file.
 * Uses a 30s timeout to prevent silent container hangs on unresponsive URLs.
 */
async function fetchBundle(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch bundle from ${url}: ${response.status} ${response.statusText}`,
    );
  }

  const content = await response.text();

  if (!content.trim()) {
    throw new Error(`Bundle fetched from ${url} is empty`);
  }

  writeFileSync(TEMP_BUNDLE_PATH, content, 'utf-8');
  return TEMP_BUNDLE_PATH;
}

/**
 * Read bundle from stdin and write to temp file
 */
async function readBundleFromStdin(): Promise<string> {
  const content = await readStdin(); // throws if empty
  writeFileSync(TEMP_BUNDLE_PATH, content, 'utf-8');
  return TEMP_BUNDLE_PATH;
}

/**
 * Resolve the bundle to a local file path
 *
 * Priority: file path (if exists) > stdin > URL > file path (fallback)
 *
 * File path is checked first because !isTTY is true in Docker detached mode
 * (/dev/null stdin), which would falsely trigger stdin reading and crash.
 *
 * @param bundleEnv - Value of the BUNDLE env var (path or URL)
 * @returns Resolved bundle with file path and source type
 */
export async function resolveBundle(
  bundleEnv: string,
): Promise<ResolvedBundle> {
  // 1. If BUNDLE points to an existing file, use it directly
  //    This prevents false stdin detection in Docker detached mode
  if (!isUrl(bundleEnv) && existsSync(bundleEnv)) {
    return { path: bundleEnv, source: 'file' };
  }

  // 2. URL — check before stdin to avoid false stdin detection in containers
  //    (process.stdin.isTTY is undefined in non-interactive shells/Docker)
  if (isUrl(bundleEnv)) {
    const path = await fetchBundle(bundleEnv);
    return { path, source: 'url' };
  }

  // 3. Stdin pipe (only when BUNDLE is not a file or URL)
  if (isStdinPiped()) {
    const path = await readBundleFromStdin();
    return { path, source: 'stdin' };
  }

  // 4. File path (fallback — file may not exist yet for config paths)
  return { path: bundleEnv, source: 'file' };
}
