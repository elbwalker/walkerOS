/**
 * Build artifact cache for flow.json configurations
 *
 * Caches compiled bundles based on configuration content + date.
 * Enables intelligent cache reuse with daily rebuild guarantee.
 */

import fs from 'fs-extra';
import path from 'path';
import { getFlowConfigCacheKey } from './cache-utils.js';
import { getTmpPath } from './tmp.js';

/**
 * Get the cache file path for a flow.json configuration
 */
export async function getBuildCachePath(
  configContent: string,
  tmpDir?: string,
): Promise<string> {
  const cacheDir = getTmpPath(tmpDir, 'cache', 'builds');
  const cacheKey = await getFlowConfigCacheKey(configContent);
  return path.join(cacheDir, `${cacheKey}.js`);
}

/**
 * Check if a cached build exists for the given configuration
 */
export async function isBuildCached(
  configContent: string,
  tmpDir?: string,
): Promise<boolean> {
  const cachePath = await getBuildCachePath(configContent, tmpDir);
  return fs.pathExists(cachePath);
}

/**
 * Store a build artifact in the cache
 */
export async function cacheBuild(
  configContent: string,
  buildOutput: string,
  tmpDir?: string,
): Promise<void> {
  const cachePath = await getBuildCachePath(configContent, tmpDir);
  await fs.ensureDir(path.dirname(cachePath));
  await fs.writeFile(cachePath, buildOutput, 'utf-8');
}

/**
 * Retrieve a cached build artifact
 */
export async function getCachedBuild(
  configContent: string,
  tmpDir?: string,
): Promise<string | null> {
  const cachePath = await getBuildCachePath(configContent, tmpDir);

  if (await fs.pathExists(cachePath)) {
    return await fs.readFile(cachePath, 'utf-8');
  }

  return null;
}
