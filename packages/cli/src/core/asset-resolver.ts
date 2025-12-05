/**
 * Asset Resolver
 *
 * Unified path resolution for package assets (examples) and user assets.
 * Assets are always siblings to the CLI entry point (in dist/ for production).
 */

import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import path from 'path';

/**
 * Cached asset directory to avoid repeated filesystem checks
 */
let cachedAssetDir: string | undefined;

/**
 * Get the directory containing CLI assets (examples).
 *
 * In production: assets are in dist/ alongside the bundled CLI
 * In development: assets are at package root
 *
 * @returns Absolute path to assets directory
 */
export function getAssetDir(): string {
  if (cachedAssetDir) return cachedAssetDir;

  const currentFile = fileURLToPath(import.meta.url);
  let dir = path.dirname(currentFile);

  // Walk up until we find a directory with examples/ sibling
  while (dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, 'examples'))) {
      cachedAssetDir = dir;
      return dir;
    }
    dir = path.dirname(dir);
  }

  // Fallback to current file's directory (shouldn't happen if build is correct)
  cachedAssetDir = path.dirname(currentFile);
  return cachedAssetDir;
}

/**
 * Asset type for resolution strategy
 */
export type AssetType = 'config' | 'bundle';

/**
 * Resolve asset path using unified strategy
 *
 * Resolution rules:
 * 1. Bare names (no / or \) → Package asset (examples)
 * 2. Relative paths (./ or ../) → User asset relative to base directory
 * 3. Absolute paths → Use as-is
 *
 * @param assetPath - Path to resolve
 * @param assetType - Type of asset (determines package subdirectory)
 * @param baseDir - Base directory for relative paths (defaults to cwd)
 * @returns Absolute path to asset
 */
export function resolveAsset(
  assetPath: string,
  assetType: AssetType,
  baseDir?: string,
): string {
  // Bare name → package asset (examples directory)
  if (!assetPath.includes('/') && !assetPath.includes('\\')) {
    const assetDir = getAssetDir();
    return path.join(assetDir, 'examples', assetPath);
  }

  // Absolute path → use as-is
  if (path.isAbsolute(assetPath)) {
    return assetPath;
  }

  // Relative path → resolve from base directory
  return path.resolve(baseDir || process.cwd(), assetPath);
}
