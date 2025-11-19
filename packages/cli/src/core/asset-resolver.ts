/**
 * Asset Resolver
 *
 * Unified path resolution for package assets (templates, examples) and user assets (configs, custom templates).
 * Works identically in both local and Docker environments.
 */

import { fileURLToPath } from 'url';
import path from 'path';

/**
 * Get the package root directory
 *
 * Uses import.meta.url to find the package root, works in both environments:
 * - Production (dist): /path/to/packages/cli/dist/index.js → /path/to/packages/cli
 * - Test (src): /path/to/packages/cli/src/core/asset-resolver.ts → /path/to/packages/cli
 * - Docker: /cli
 *
 * @returns Absolute path to package root
 */
export function getPackageRoot(): string {
  const currentFile = fileURLToPath(import.meta.url);

  // In test/dev mode: files are in src/ directory (e.g., src/core/asset-resolver.ts)
  // In production: all code is bundled into dist/index.js
  if (currentFile.includes('/src/')) {
    // Running from source (tests): go up to package root
    // e.g., /path/to/packages/cli/src/core/asset-resolver.ts -> /path/to/packages/cli
    const srcIndex = currentFile.indexOf('/src/');
    return currentFile.substring(0, srcIndex);
  }

  // Running from dist (production/bundled)
  // e.g., /path/to/packages/cli/dist/index.js -> /path/to/packages/cli
  return path.resolve(currentFile, '../..');
}

/**
 * Asset type for resolution strategy
 */
export type AssetType = 'template' | 'config' | 'bundle';

/**
 * Resolve asset path using unified strategy
 *
 * Resolution rules:
 * 1. Bare names (no / or \) → Package asset
 *    - "web.hbs" → ${packageRoot}/templates/web.hbs
 *    - "server-collect.json" → ${packageRoot}/examples/server-collect.json
 *
 * 2. Relative paths (./ or ../) → User asset relative to base directory
 *    - "./my-template.hbs" → ${baseDir}/my-template.hbs
 *
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
  const packageRoot = getPackageRoot();

  // Bare name → package asset
  if (!assetPath.includes('/') && !assetPath.includes('\\')) {
    if (assetType === 'template') {
      return path.join(packageRoot, 'templates', assetPath);
    }
    // config or bundle → examples directory
    return path.join(packageRoot, 'examples', assetPath);
  }

  // Absolute path → use as-is
  if (path.isAbsolute(assetPath)) {
    return assetPath;
  }

  // Relative path → resolve from base directory
  const resolveBase = baseDir || process.cwd();
  return path.resolve(resolveBase, assetPath);
}
