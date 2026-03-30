/**
 * Build artifact cache for flow.json configurations
 *
 * Caches compiled bundles based on configuration content + date.
 * Enables intelligent cache reuse with daily rebuild guarantee.
 */

import fs from 'fs-extra';
import path from 'path';
import { getHashServer } from '@walkeros/server-core';
import { getFlowSettingsCacheKey } from './cache-utils.js';
import { getTmpPath } from './tmp.js';

/**
 * Get the cache file path for a flow.json configuration
 */
export async function getBuildCachePath(
  configContent: string,
  tmpDir?: string,
): Promise<string> {
  const cacheDir = getTmpPath(tmpDir, 'cache', 'builds');
  const cacheKey = await getFlowSettingsCacheKey(configContent);
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

/**
 * Get the cache file path for compiled code (code-only esbuild output).
 * Uses content-based hashing only (no date component) since code is
 * deterministic for the same packages + esbuild options.
 */
export async function getCodeCachePath(
  codeContent: string,
  tmpDir?: string,
): Promise<string> {
  const cacheDir = getTmpPath(tmpDir, 'cache', 'code');
  const cacheKey = await getHashServer(codeContent, 12);
  return path.join(cacheDir, `${cacheKey}.js`);
}

export async function isCodeCached(
  codeContent: string,
  tmpDir?: string,
): Promise<boolean> {
  const cachePath = await getCodeCachePath(codeContent, tmpDir);
  return fs.pathExists(cachePath);
}

export async function cacheCode(
  codeContent: string,
  codeOutput: string,
  tmpDir?: string,
): Promise<void> {
  const cachePath = await getCodeCachePath(codeContent, tmpDir);
  await fs.ensureDir(path.dirname(cachePath));
  await fs.writeFile(cachePath, codeOutput, 'utf-8');
}

export async function getCachedCode(
  codeContent: string,
  tmpDir?: string,
): Promise<string | null> {
  const cachePath = await getCodeCachePath(codeContent, tmpDir);
  if (await fs.pathExists(cachePath)) {
    return fs.readFile(cachePath, 'utf-8');
  }
  return null;
}
