import { existsSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { Flow } from '@walkeros/core';
import {
  getCacheDir,
  getBuildDir,
  getCacheKey,
  loadCacheMetadata,
  saveCacheMetadata,
  isCached,
  getCachedCode,
  cachePackageCode,
  cleanupCache,
  getCacheStats,
  cleanBuildDir,
  isPackageInstalled,
  isPackageExtracted,
  getExtractedCode,
} from '../src/core/cache';

describe('Cache System', () => {
  let tempCacheDir: string;
  let tempBuildDir: string;

  beforeEach(() => {
    // Create unique temporary directories for each test
    tempCacheDir = join(
      tmpdir(),
      `walkeros-test-cache-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    );
    tempBuildDir = join(
      tmpdir(),
      `walkeros-test-build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    );
  });

  afterEach(() => {
    // Clean up temporary directories
    if (existsSync(tempCacheDir)) {
      rmSync(tempCacheDir, { recursive: true, force: true });
    }
    if (existsSync(tempBuildDir)) {
      rmSync(tempBuildDir, { recursive: true, force: true });
    }
  });

  describe('Cache Directory Management', () => {
    it('should create cache directory if it does not exist', () => {
      const cacheDir = getCacheDir(tempCacheDir);
      expect(existsSync(cacheDir)).toBe(true);
      expect(cacheDir).toBe(tempCacheDir);
    });

    it('should create build directory if it does not exist', () => {
      const buildDir = getBuildDir(tempBuildDir);
      expect(existsSync(buildDir)).toBe(true);
      expect(buildDir).toBe(tempBuildDir);
    });

    it('should use default cache directory when none provided', () => {
      const cacheDir = getCacheDir();
      expect(cacheDir).toContain('.walkeros-cache');
      expect(existsSync(cacheDir)).toBe(true);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys', () => {
      const pkg: Flow.Package = {
        id: 'walkerOSCore',
        name: '@walkeros/core',
        version: '1.0.0',
        type: 'core',
      };

      const key1 = getCacheKey(pkg);
      const key2 = getCacheKey(pkg);

      expect(key1).toBe(key2);
      expect(key1).toBe('@walkeros_core@1.0.0');
    });

    it('should sanitize special characters in package names', () => {
      const pkg: Flow.Package = {
        id: 'scopePackageName',
        name: '@scope/package-name',
        version: '1.0.0',
        type: 'core',
      };

      const key = getCacheKey(pkg);
      expect(key).toBe('@scope_package-name@1.0.0');
      expect(key).not.toContain('/');
      expect(key).not.toContain('\\');
      expect(key).not.toContain(':');
    });
  });

  describe('Cache Metadata Management', () => {
    it('should return empty metadata for non-existent cache', () => {
      const metadata = loadCacheMetadata(tempCacheDir);

      expect(metadata.entries).toEqual({});
      expect(metadata.lastCleanup).toBeGreaterThan(0);
    });

    it('should save and load metadata correctly', () => {
      getCacheDir(tempCacheDir); // Create cache directory

      const metadata = {
        entries: {
          'test_pkg@1.0.0': {
            name: 'test-pkg',
            version: '1.0.0',
            code: '/path/to/code.js',
            timestamp: Date.now(),
          },
        },
        lastCleanup: Date.now(),
      };

      saveCacheMetadata(tempCacheDir, metadata);
      const loaded = loadCacheMetadata(tempCacheDir);

      expect(loaded.entries).toEqual(metadata.entries);
      expect(loaded.lastCleanup).toBe(metadata.lastCleanup);
    });

    it('should handle corrupted metadata file gracefully', () => {
      getCacheDir(tempCacheDir);

      // Write invalid JSON to metadata file
      const metadataPath = join(tempCacheDir, 'metadata.json');
      writeFileSync(metadataPath, 'invalid json');

      const metadata = loadCacheMetadata(tempCacheDir);
      expect(metadata.entries).toEqual({});
      expect(metadata.lastCleanup).toBeGreaterThan(0);
    });
  });

  describe('Cache Validation', () => {
    const mockPackage: Flow.Package = {
      id: 'walkerOSCore',
      name: '@walkeros/core',
      version: '1.0.0',
      type: 'core',
    };

    it('should return false for uncached packages', () => {
      const cached = isCached(mockPackage, tempCacheDir);
      expect(cached).toBe(false);
    });

    it('should return true for fresh cached packages', () => {
      const mockCode = 'console.log("mock code");';

      cachePackageCode(mockPackage, mockCode, tempCacheDir);
      const cached = isCached(mockPackage, tempCacheDir);

      expect(cached).toBe(true);
    });

    it('should return false for expired cache entries', () => {
      const mockCode = 'console.log("mock code");';

      // Create cache entry with old timestamp
      getCacheDir(tempCacheDir);
      const key = getCacheKey(mockPackage);
      const packagesDir = join(tempCacheDir, 'packages');
      mkdirSync(packagesDir, { recursive: true });

      const codePath = join(packagesDir, `${key}.js`);
      writeFileSync(codePath, mockCode);

      const metadata = {
        entries: {
          [key]: {
            name: mockPackage.name,
            version: mockPackage.version,
            code: codePath,
            timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago (expired)
          },
        },
        lastCleanup: Date.now(),
      };

      saveCacheMetadata(tempCacheDir, metadata);

      const cached = isCached(mockPackage, tempCacheDir);
      expect(cached).toBe(false);
    });
  });

  describe('Cache Storage and Retrieval', () => {
    const mockPackage: Flow.Package = {
      id: 'walkerOSTestPackage',
      name: '@walkeros/test-package',
      version: '2.1.0',
      type: 'source',
    };

    it('should cache and retrieve package code correctly', () => {
      const mockCode = 'const testPackage = { version: "2.1.0" };';
      const mockMetadata = { tarball: 'https://registry.npmjs.org/test.tgz' };

      cachePackageCode(mockPackage, mockCode, tempCacheDir, mockMetadata);
      const retrievedCode = getCachedCode(mockPackage, tempCacheDir);

      expect(retrievedCode).toBe(mockCode);
    });

    it('should update metadata when caching packages', () => {
      const mockCode = 'const anotherPackage = {};';
      const mockMetadata = { main: 'index.js' };

      cachePackageCode(mockPackage, mockCode, tempCacheDir, mockMetadata);
      const metadata = loadCacheMetadata(tempCacheDir);
      const key = getCacheKey(mockPackage);

      expect(metadata.entries[key]).toBeDefined();
      expect(metadata.entries[key].name).toBe(mockPackage.name);
      expect(metadata.entries[key].version).toBe(mockPackage.version);
      expect(metadata.entries[key].metadata).toStrictEqual(mockMetadata);
      expect(metadata.entries[key].timestamp).toBeGreaterThan(0);
    });
  });

  describe('Cache Cleanup', () => {
    it('should remove expired cache entries', () => {
      getCacheDir(tempCacheDir);

      const recentPackage: Flow.Package = {
        id: 'walkerOSRecent',
        name: '@walkeros/recent',
        version: '1.0.0',
        type: 'core',
      };
      const oldPackage: Flow.Package = {
        id: 'walkerOSOld',
        name: '@walkeros/old',
        version: '1.0.0',
        type: 'core',
      };

      // Cache recent package
      cachePackageCode(recentPackage, 'recent code', tempCacheDir);

      // Manually create old cache entry
      const oldKey = getCacheKey(oldPackage);
      const packagesDir = join(tempCacheDir, 'packages');
      const oldCodePath = join(packagesDir, `${oldKey}.js`);
      writeFileSync(oldCodePath, 'old code');

      const metadata = loadCacheMetadata(tempCacheDir);
      metadata.entries[oldKey] = {
        name: oldPackage.name,
        version: oldPackage.version,
        code: oldCodePath,
        timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days ago
      };
      saveCacheMetadata(tempCacheDir, metadata);

      // Run cleanup with 7-day max age
      cleanupCache(tempCacheDir, 7 * 24 * 60 * 60 * 1000);

      // Check results
      expect(isCached(recentPackage, tempCacheDir)).toBe(true);
      expect(isCached(oldPackage, tempCacheDir)).toBe(false);
      expect(existsSync(oldCodePath)).toBe(false);
    });
  });

  describe('Cache Statistics', () => {
    it('should return empty stats for non-existent cache', () => {
      const stats = getCacheStats(tempCacheDir);

      expect(stats.entries).toBe(0);
      expect(stats.size).toBe('0 B');
      expect(stats.lastCleanup).toBeInstanceOf(Date);
    });

    it('should calculate cache statistics correctly', () => {
      const package1: Flow.Package = {
        id: 'walkerOSPkg1',
        name: '@walkeros/pkg1',
        version: '1.0.0',
        type: 'core',
      };
      const package2: Flow.Package = {
        id: 'walkerOSPkg2',
        name: '@walkeros/pkg2',
        version: '2.0.0',
        type: 'source',
      };

      cachePackageCode(package1, 'package 1 code', tempCacheDir);
      cachePackageCode(
        package2,
        'package 2 code with more content',
        tempCacheDir,
      );

      const stats = getCacheStats(tempCacheDir);

      expect(stats.entries).toBe(2);
      expect(stats.size).toContain('B'); // Should show size in bytes/KB/MB
      expect(stats.lastCleanup).toBeInstanceOf(Date);
    });

    it('should format file sizes correctly', () => {
      const largePackage: Flow.Package = {
        id: 'walkerOSLarge',
        name: '@walkeros/large',
        version: '1.0.0',
        type: 'destination',
      };
      const largeCode = 'a'.repeat(2048); // 2KB of content

      cachePackageCode(largePackage, largeCode, tempCacheDir);
      const stats = getCacheStats(tempCacheDir);

      expect(stats.entries).toBe(1);
      expect(stats.size).toContain('KB');
    });
  });

  describe('Build Directory Management', () => {
    it('should clean build directory when it exists', () => {
      getBuildDir(tempBuildDir); // Create directory

      // Add some files to the directory
      const testFile = join(tempBuildDir, 'test.txt');
      writeFileSync(testFile, 'test content');

      expect(existsSync(testFile)).toBe(true);

      cleanBuildDir(tempBuildDir);

      expect(existsSync(tempBuildDir)).toBe(false);
    });

    it('should handle cleaning non-existent build directory gracefully', () => {
      // Should not throw error
      expect(() => cleanBuildDir(tempBuildDir)).not.toThrow();
    });

    it('should check if package is installed in build directory', () => {
      const mockPackage: Flow.Package = {
        id: 'walkerOSTestPkg',
        name: '@walkeros/test-pkg',
        version: '1.0.0',
        type: 'core',
      };

      // Package not installed initially
      expect(isPackageInstalled(mockPackage, tempBuildDir)).toBe(false);

      // Create mock node_modules structure
      getBuildDir(tempBuildDir);
      const nodeModulesDir = join(
        tempBuildDir,
        'node_modules',
        mockPackage.name,
      );
      mkdirSync(nodeModulesDir, { recursive: true });

      // Now package should be detected as installed
      expect(isPackageInstalled(mockPackage, tempBuildDir)).toBe(true);
    });

    it('should check if package is extracted in build directory', () => {
      const mockPackage: Flow.Package = {
        id: 'walkerOSTestPkg2',
        name: '@walkeros/test-pkg',
        version: '2.0.0',
        type: 'source',
      };

      // Package not extracted initially
      expect(isPackageExtracted(mockPackage, tempBuildDir)).toBe(false);

      // Create extracted directory structure
      getBuildDir(tempBuildDir);
      const extractedDir = join(tempBuildDir, 'extracted');
      mkdirSync(extractedDir, { recursive: true });

      const key = getCacheKey(mockPackage);
      const extractedFile = join(extractedDir, `${key}.js`);
      writeFileSync(extractedFile, 'extracted package code');

      // Now package should be detected as extracted
      expect(isPackageExtracted(mockPackage, tempBuildDir)).toBe(true);
    });

    it('should get extracted package code from build directory', () => {
      const mockPackage: Flow.Package = {
        id: 'walkerOSExtractTest',
        name: '@walkeros/extract-test',
        version: '3.0.0',
        type: 'destination',
      };
      const mockCode = 'const extractedCode = "test";';

      // Create extracted directory structure
      getBuildDir(tempBuildDir);
      const extractedDir = join(tempBuildDir, 'extracted');
      mkdirSync(extractedDir, { recursive: true });

      const key = getCacheKey(mockPackage);
      const extractedFile = join(extractedDir, `${key}.js`);
      writeFileSync(extractedFile, mockCode);

      const retrievedCode = getExtractedCode(mockPackage, tempBuildDir);
      expect(retrievedCode).toBe(mockCode);
    });
  });
});
