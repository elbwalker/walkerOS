/**
 * Resolve bundle input to a local file path
 *
 * Priority order:
 * 1. File path (exists) - BUNDLE points to an existing local file
 * 2. URL                - BUNDLE is an http(s) URL → fetch and write to writePath
 * 3. Stdin              - data piped into the process
 * 4. File path (fallback) - BUNDLE path that doesn't exist yet
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { isStdinPiped, readStdin } from '../core/stdin.js';

/**
 * Determine where to write fetched/stdin bundles.
 * In Docker: /app/flow/ exists → write there (module resolution works naturally).
 * Local dev: falls back to /tmp/.
 */
function getDefaultWritePath(): string {
  if (existsSync('/app/flow')) return '/app/flow/bundle.mjs';
  return '/tmp/walkeros-bundle.mjs';
}

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
 * Write bundle content to disk, ensuring parent directory exists.
 */
function writeBundleToDisk(writePath: string, content: string): void {
  const dir = dirname(writePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(writePath, content, 'utf-8');
}

/**
 * Fetch bundle from URL and write to disk.
 * Uses a 30s timeout to prevent silent container hangs on unresponsive URLs.
 */
async function fetchBundle(url: string, writePath: string): Promise<string> {
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

  writeBundleToDisk(writePath, content);
  return writePath;
}

/**
 * Read bundle from stdin and write to disk
 */
async function readBundleFromStdin(writePath: string): Promise<string> {
  const content = await readStdin(); // throws if empty
  writeBundleToDisk(writePath, content);
  return writePath;
}

/**
 * Resolve the bundle to a local file path
 *
 * @param bundleEnv - Value of the BUNDLE env var (path or URL)
 * @returns Resolved bundle with file path and source type
 */
export async function resolveBundle(
  bundleEnv: string,
): Promise<ResolvedBundle> {
  const writePath = getDefaultWritePath();
  // 1. If BUNDLE points to an existing file, use it directly
  //    This prevents false stdin detection in Docker detached mode
  if (!isUrl(bundleEnv) && existsSync(bundleEnv)) {
    return { path: bundleEnv, source: 'file' };
  }

  // 2. URL — check before stdin to avoid false stdin detection in containers
  //    (process.stdin.isTTY is undefined in non-interactive shells/Docker)
  if (isUrl(bundleEnv)) {
    const path = await fetchBundle(bundleEnv, writePath);
    return { path, source: 'url' };
  }

  // 3. Stdin pipe (only when BUNDLE is not a file or URL)
  if (isStdinPiped()) {
    const path = await readBundleFromStdin(writePath);
    return { path, source: 'stdin' };
  }

  // 4. File path (fallback — file may not exist yet for config paths)
  return { path: bundleEnv, source: 'file' };
}
