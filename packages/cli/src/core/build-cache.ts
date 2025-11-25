/**
 * Build artifact cache for flow.json configurations
 *
 * Caches compiled bundles based on configuration content + date.
 * Enables intelligent cache reuse with daily rebuild guarantee.
 */

import fs from 'fs-extra';
import path from 'path';
import { getFlowConfigCacheKey } from './cache-utils';

const BUILD_CACHE_DIR = path.join('.tmp', 'cache', 'builds');

/**
 * Get the cache file path for a flow.json configuration
 */
export async function getBuildCachePath(
  configContent: string,
  cacheDir: string = BUILD_CACHE_DIR,
): Promise<string> {
  const cacheKey = await getFlowConfigCacheKey(configContent);
  return path.join(cacheDir, `${cacheKey}.js`);
}

/**
 * Check if a cached build exists for the given configuration
 */
export async function isBuildCached(
  configContent: string,
  cacheDir: string = BUILD_CACHE_DIR,
): Promise<boolean> {
  const cachePath = await getBuildCachePath(configContent, cacheDir);
  return fs.pathExists(cachePath);
}

/**
 * Store a build artifact in the cache
 */
export async function cacheBuild(
  configContent: string,
  buildOutput: string,
  cacheDir: string = BUILD_CACHE_DIR,
): Promise<void> {
  const cachePath = await getBuildCachePath(configContent, cacheDir);
  await fs.ensureDir(path.dirname(cachePath));
  await fs.writeFile(cachePath, buildOutput, 'utf-8');
}

/**
 * Retrieve a cached build artifact
 */
export async function getCachedBuild(
  configContent: string,
  cacheDir: string = BUILD_CACHE_DIR,
): Promise<string | null> {
  const cachePath = await getBuildCachePath(configContent, cacheDir);

  if (await fs.pathExists(cachePath)) {
    return await fs.readFile(cachePath, 'utf-8');
  }

  return null;
}
