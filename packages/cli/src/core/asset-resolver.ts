/**
 * Asset Resolver
 *
 * Unified path resolution for CLI assets.
 * All paths resolve relative to base directory (defaults to cwd).
 */

import path from 'path';
import { isUrl } from '../config/utils.js';

/**
 * Asset type for resolution strategy
 */
export type AssetType = 'config' | 'bundle';

/**
 * Resolve asset path.
 *
 * Resolution rules:
 * 1. URLs → pass through unchanged
 * 2. Absolute paths → use as-is
 * 3. Everything else (bare names, relative paths) → resolve from base directory
 *
 * @param assetPath - Path to resolve
 * @param assetType - Type of asset (currently unused, kept for API compatibility)
 * @param baseDir - Base directory for relative paths (defaults to cwd)
 * @returns Absolute path to asset
 */
export function resolveAsset(
  assetPath: string,
  assetType: AssetType,
  baseDir?: string,
): string {
  // URL → pass through unchanged
  if (isUrl(assetPath)) {
    return assetPath;
  }

  // Absolute path → use as-is
  if (path.isAbsolute(assetPath)) {
    return assetPath;
  }

  // Everything else → resolve from base directory (cwd by default)
  return path.resolve(baseDir || process.cwd(), assetPath);
}
