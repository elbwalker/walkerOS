/**
 * Resolve bundle input to a local file path
 *
 * Supports three input sources (checked in priority order):
 * 1. Stdin pipe   - data piped into the process
 * 2. URL          - BUNDLE env var is an http(s) URL
 * 3. File path    - BUNDLE env var is a local path (default)
 */

import { writeFileSync } from 'fs';
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
 * Priority: stdin > URL > file path
 *
 * @param bundleEnv - Value of the BUNDLE env var (path or URL)
 * @returns Resolved bundle with file path and source type
 */
export async function resolveBundle(
  bundleEnv: string,
): Promise<ResolvedBundle> {
  // 1. Stdin takes highest priority
  if (isStdinPiped()) {
    const path = await readBundleFromStdin();
    return { path, source: 'stdin' };
  }

  // 2. URL detection
  if (isUrl(bundleEnv)) {
    const path = await fetchBundle(bundleEnv);
    return { path, source: 'url' };
  }

  // 3. File path (default, existing behavior)
  return { path: bundleEnv, source: 'file' };
}
