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
import type { MinifyOptions } from '../types/bundle.js';

/**
 * Inputs that participate in the L2 code cache key.
 *
 * The L2 cache stores stage-1 esbuild output (compiled code skeleton).
 * Two builds with different externals / platform / format / minify / target /
 * window globals / resolved package versions but identical generated entry code
 * MUST produce different cache keys, otherwise stage-2 would receive stale
 * stage-1 output. Hashing only `codeContent` is therefore unsafe.
 */
export interface CodeCacheKeyInputs {
  externals: Set<string>;
  platform: 'node' | 'browser';
  target: string;
  nodeMajor: number;
  format: 'esm' | 'iife' | 'cjs';
  minify?: boolean;
  minifyOptions?: MinifyOptions;
  windowCollector?: string;
  windowElb?: string;
  versionsHash: string;
}

function serializeKeyInputs(inputs: CodeCacheKeyInputs): string {
  return JSON.stringify({
    externals: [...inputs.externals].sort(),
    platform: inputs.platform,
    target: inputs.target,
    nodeMajor: inputs.nodeMajor,
    format: inputs.format,
    minify: inputs.minify ?? false,
    minifyOptions: inputs.minifyOptions ?? null,
    windowCollector: inputs.windowCollector ?? null,
    windowElb: inputs.windowElb ?? null,
    versionsHash: inputs.versionsHash,
  });
}

/**
 * Compute the L2 cache key from code content + key inputs. Single source of
 * truth so getCodeCachePath and ensureCodeOnDisk cannot drift apart on hash
 * format, separator, or length.
 */
async function computeCodeCacheKey(
  codeContent: string,
  inputs: CodeCacheKeyInputs,
): Promise<string> {
  const keyMaterial = `${codeContent}\n###\n${serializeKeyInputs(inputs)}`;
  return getHashServer(keyMaterial, 12);
}

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
 * Hashes `codeContent` PLUS all build-shaping inputs that affect stage-1
 * output: externals, platform, target, format, minify, window globals, and
 * the resolved package versions hash. This prevents stage-2 from receiving
 * stale stage-1 output when only build options or versions change.
 */
export async function getCodeCachePath(
  codeContent: string,
  tmpDir: string | undefined,
  inputs: CodeCacheKeyInputs,
): Promise<string> {
  const cacheDir = getTmpPath(tmpDir, 'cache', 'code');
  const cacheKey = await computeCodeCacheKey(codeContent, inputs);
  return path.join(cacheDir, `${cacheKey}.js`);
}

export async function isCodeCached(
  codeContent: string,
  tmpDir: string | undefined,
  inputs: CodeCacheKeyInputs,
): Promise<boolean> {
  const cachePath = await getCodeCachePath(codeContent, tmpDir, inputs);
  return fs.pathExists(cachePath);
}

export async function cacheCode(
  codeContent: string,
  codeOutput: string,
  tmpDir: string | undefined,
  inputs: CodeCacheKeyInputs,
): Promise<void> {
  const cachePath = await getCodeCachePath(codeContent, tmpDir, inputs);
  await fs.ensureDir(path.dirname(cachePath));
  await fs.writeFile(cachePath, codeOutput, 'utf-8');
}

export async function getCachedCode(
  codeContent: string,
  tmpDir: string | undefined,
  inputs: CodeCacheKeyInputs,
): Promise<string | null> {
  const cachePath = await getCodeCachePath(codeContent, tmpDir, inputs);
  if (await fs.pathExists(cachePath)) {
    return fs.readFile(cachePath, 'utf-8');
  }
  return null;
}

/**
 * Write compiled code to a .mjs file on disk and return the path.
 * Used by the two-stage bundler so stage 2 esbuild can import from stage 1 output.
 * Content-addressed using the same composite key as the L2 cache so the on-disk
 * .mjs file lines up with the cached compiled output.
 */
export async function ensureCodeOnDisk(
  codeContent: string,
  compiledCode: string,
  tmpDir: string | undefined,
  inputs: CodeCacheKeyInputs,
): Promise<string> {
  const cacheDir = getTmpPath(tmpDir, 'cache', 'code');
  const cacheKey = await computeCodeCacheKey(codeContent, inputs);
  const cachePath = path.join(cacheDir, `${cacheKey}.mjs`);

  if (!(await fs.pathExists(cachePath))) {
    await fs.ensureDir(path.dirname(cachePath));
    await fs.writeFile(cachePath, compiledCode, 'utf-8');
  }

  return cachePath;
}
