import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';
import type { Flow } from '@walkeros/core';

export interface CacheOptions {
  cacheDir?: string;
  buildDir?: string;
  noCache?: boolean;
  clean?: boolean;
}

export interface PackageCacheEntry {
  name: string;
  version: string;
  code: string;
  timestamp: number;
  metadata?: any;
}

export interface CacheMetadata {
  entries: Record<string, PackageCacheEntry>;
  lastCleanup: number;
}

/**
 * Get the cache directory path, creating if it doesn't exist
 */
export function getCacheDir(cacheDir?: string): string {
  const defaultCacheDir = join(homedir(), '.walkeros-cache');
  const dir = resolve(cacheDir || defaultCacheDir);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  return dir;
}

/**
 * Get the build directory path, creating if it doesn't exist
 */
export function getBuildDir(buildDir?: string): string {
  const dir = resolve(buildDir || join(process.cwd(), 'tmp'));

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  return dir;
}

/**
 * Clean the build directory if it exists
 */
export function cleanBuildDir(buildDir: string): void {
  if (existsSync(buildDir)) {
    require('fs').rmSync(buildDir, { recursive: true, force: true });
  }
}

/**
 * Check if package is already installed in build directory
 */
export function isPackageInstalled(
  pkg: Flow.Package,
  buildDir: string,
): boolean {
  const packagePath = join(buildDir, 'node_modules', pkg.name);
  return existsSync(packagePath);
}

/**
 * Check if extracted package exists in build directory
 */
export function isPackageExtracted(
  pkg: Flow.Package,
  buildDir: string,
): boolean {
  const key = getCacheKey(pkg);
  const extractedPath = join(buildDir, 'extracted', `${key}.js`);
  return existsSync(extractedPath);
}

/**
 * Get extracted package code from build directory
 */
export function getExtractedCode(pkg: Flow.Package, buildDir: string): string {
  const key = getCacheKey(pkg);
  const extractedPath = join(buildDir, 'extracted', `${key}.js`);
  return readFileSync(extractedPath, 'utf-8');
}

/**
 * Generate cache key for a package
 */
export function getCacheKey(pkg: Flow.Package): string {
  return `${pkg.name}@${pkg.version}`.replace(/[\/\\:]/g, '_');
}

/**
 * Load cache metadata
 */
export function loadCacheMetadata(cacheDir: string): CacheMetadata {
  const metadataPath = join(cacheDir, 'metadata.json');

  if (!existsSync(metadataPath)) {
    return {
      entries: {},
      lastCleanup: Date.now(),
    };
  }

  try {
    return JSON.parse(readFileSync(metadataPath, 'utf-8'));
  } catch {
    // Return empty metadata if file is corrupted
    return {
      entries: {},
      lastCleanup: Date.now(),
    };
  }
}

/**
 * Save cache metadata
 */
export function saveCacheMetadata(
  cacheDir: string,
  metadata: CacheMetadata,
): void {
  const metadataPath = join(cacheDir, 'metadata.json');
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
}

/**
 * Check if package is cached and still valid
 */
export function isCached(pkg: Flow.Package, cacheDir: string): boolean {
  const metadata = loadCacheMetadata(cacheDir);
  const key = getCacheKey(pkg);
  const entry = metadata.entries[key];

  if (!entry) {
    return false;
  }

  // Check if cache entry is too old (24 hours)
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours in ms
  if (Date.now() - entry.timestamp > maxAge) {
    return false;
  }

  // Check if cached code file exists
  const codePath = join(cacheDir, 'packages', `${key}.js`);
  return existsSync(codePath);
}

/**
 * Get cached package code
 */
export function getCachedCode(pkg: Flow.Package, cacheDir: string): string {
  const key = getCacheKey(pkg);
  const codePath = join(cacheDir, 'packages', `${key}.js`);
  return readFileSync(codePath, 'utf-8');
}

/**
 * Cache package code
 */
export function cachePackageCode(
  pkg: Flow.Package,
  code: string,
  cacheDir: string,
  metadata?: any,
): void {
  const key = getCacheKey(pkg);

  // Ensure packages directory exists
  const packagesDir = join(cacheDir, 'packages');
  if (!existsSync(packagesDir)) {
    mkdirSync(packagesDir, { recursive: true });
  }

  // Write code to cache
  const codePath = join(packagesDir, `${key}.js`);
  writeFileSync(codePath, code);

  // Update metadata
  const cacheMetadata = loadCacheMetadata(cacheDir);
  cacheMetadata.entries[key] = {
    name: pkg.name,
    version: pkg.version,
    code: codePath,
    timestamp: Date.now(),
    metadata,
  };

  saveCacheMetadata(cacheDir, cacheMetadata);
}

/**
 * Clean up old cache entries
 */
export function cleanupCache(
  cacheDir: string,
  maxAge: number = 7 * 24 * 60 * 60 * 1000,
): void {
  const metadata = loadCacheMetadata(cacheDir);
  const now = Date.now();
  let cleaned = false;

  Object.keys(metadata.entries).forEach((key) => {
    const entry = metadata.entries[key];
    if (now - entry.timestamp > maxAge) {
      // Remove from metadata
      delete metadata.entries[key];
      cleaned = true;

      // Try to remove the cached file
      try {
        const codePath = join(cacheDir, 'packages', `${key}.js`);
        if (existsSync(codePath)) {
          require('fs').unlinkSync(codePath);
        }
      } catch {
        // Ignore file deletion errors
      }
    }
  });

  if (cleaned) {
    metadata.lastCleanup = now;
    saveCacheMetadata(cacheDir, metadata);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(cacheDir: string): {
  entries: number;
  size: string;
  lastCleanup: Date;
} {
  if (!existsSync(cacheDir)) {
    return { entries: 0, size: '0 B', lastCleanup: new Date() };
  }

  const metadata = loadCacheMetadata(cacheDir);
  const packagesDir = join(cacheDir, 'packages');

  let totalSize = 0;
  if (existsSync(packagesDir)) {
    readdirSync(packagesDir).forEach((file) => {
      try {
        const stat = statSync(join(packagesDir, file));
        totalSize += stat.size;
      } catch {
        // Ignore stat errors
      }
    });
  }

  const formatSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return {
    entries: Object.keys(metadata.entries).length,
    size: formatSize(totalSize),
    lastCleanup: new Date(metadata.lastCleanup),
  };
}
