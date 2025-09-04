'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getCacheDir = getCacheDir;
exports.getBuildDir = getBuildDir;
exports.cleanBuildDir = cleanBuildDir;
exports.isPackageInstalled = isPackageInstalled;
exports.isPackageExtracted = isPackageExtracted;
exports.getExtractedCode = getExtractedCode;
exports.getCacheKey = getCacheKey;
exports.loadCacheMetadata = loadCacheMetadata;
exports.saveCacheMetadata = saveCacheMetadata;
exports.isCached = isCached;
exports.getCachedCode = getCachedCode;
exports.cachePackageCode = cachePackageCode;
exports.cleanupCache = cleanupCache;
exports.getCacheStats = getCacheStats;
var fs_1 = require('fs');
var path_1 = require('path');
var os_1 = require('os');
/**
 * Get the cache directory path, creating if it doesn't exist
 */
function getCacheDir(cacheDir) {
  var defaultCacheDir = (0, path_1.join)(
    (0, os_1.homedir)(),
    '.walkeros-cache',
  );
  var dir = (0, path_1.resolve)(cacheDir || defaultCacheDir);
  if (!(0, fs_1.existsSync)(dir)) {
    (0, fs_1.mkdirSync)(dir, { recursive: true });
  }
  return dir;
}
/**
 * Get the build directory path, creating if it doesn't exist
 */
function getBuildDir(buildDir) {
  var dir = (0, path_1.resolve)(
    buildDir || (0, path_1.join)(process.cwd(), 'tmp'),
  );
  if (!(0, fs_1.existsSync)(dir)) {
    (0, fs_1.mkdirSync)(dir, { recursive: true });
  }
  return dir;
}
/**
 * Clean the build directory if it exists
 */
function cleanBuildDir(buildDir) {
  if ((0, fs_1.existsSync)(buildDir)) {
    require('fs').rmSync(buildDir, { recursive: true, force: true });
  }
}
/**
 * Check if package is already installed in build directory
 */
function isPackageInstalled(pkg, buildDir) {
  var packagePath = (0, path_1.join)(buildDir, 'node_modules', pkg.name);
  return (0, fs_1.existsSync)(packagePath);
}
/**
 * Check if extracted package exists in build directory
 */
function isPackageExtracted(pkg, buildDir) {
  var key = getCacheKey(pkg);
  var extractedPath = (0, path_1.join)(
    buildDir,
    'extracted',
    ''.concat(key, '.js'),
  );
  return (0, fs_1.existsSync)(extractedPath);
}
/**
 * Get extracted package code from build directory
 */
function getExtractedCode(pkg, buildDir) {
  var key = getCacheKey(pkg);
  var extractedPath = (0, path_1.join)(
    buildDir,
    'extracted',
    ''.concat(key, '.js'),
  );
  return (0, fs_1.readFileSync)(extractedPath, 'utf-8');
}
/**
 * Generate cache key for a package
 */
function getCacheKey(pkg) {
  return ''
    .concat(pkg.name, '@')
    .concat(pkg.version)
    .replace(/[\/\\:]/g, '_');
}
/**
 * Load cache metadata
 */
function loadCacheMetadata(cacheDir) {
  var metadataPath = (0, path_1.join)(cacheDir, 'metadata.json');
  if (!(0, fs_1.existsSync)(metadataPath)) {
    return {
      entries: {},
      lastCleanup: Date.now(),
    };
  }
  try {
    return JSON.parse((0, fs_1.readFileSync)(metadataPath, 'utf-8'));
  } catch (_a) {
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
function saveCacheMetadata(cacheDir, metadata) {
  var metadataPath = (0, path_1.join)(cacheDir, 'metadata.json');
  (0, fs_1.writeFileSync)(metadataPath, JSON.stringify(metadata, null, 2));
}
/**
 * Check if package is cached and still valid
 */
function isCached(pkg, cacheDir) {
  var metadata = loadCacheMetadata(cacheDir);
  var key = getCacheKey(pkg);
  var entry = metadata.entries[key];
  if (!entry) {
    return false;
  }
  // Check if cache entry is too old (24 hours)
  var maxAge = 24 * 60 * 60 * 1000; // 24 hours in ms
  if (Date.now() - entry.timestamp > maxAge) {
    return false;
  }
  // Check if cached code file exists
  var codePath = (0, path_1.join)(cacheDir, 'packages', ''.concat(key, '.js'));
  return (0, fs_1.existsSync)(codePath);
}
/**
 * Get cached package code
 */
function getCachedCode(pkg, cacheDir) {
  var key = getCacheKey(pkg);
  var codePath = (0, path_1.join)(cacheDir, 'packages', ''.concat(key, '.js'));
  return (0, fs_1.readFileSync)(codePath, 'utf-8');
}
/**
 * Cache package code
 */
function cachePackageCode(pkg, code, cacheDir, metadata) {
  var key = getCacheKey(pkg);
  // Ensure packages directory exists
  var packagesDir = (0, path_1.join)(cacheDir, 'packages');
  if (!(0, fs_1.existsSync)(packagesDir)) {
    (0, fs_1.mkdirSync)(packagesDir, { recursive: true });
  }
  // Write code to cache
  var codePath = (0, path_1.join)(packagesDir, ''.concat(key, '.js'));
  (0, fs_1.writeFileSync)(codePath, code);
  // Update metadata
  var cacheMetadata = loadCacheMetadata(cacheDir);
  cacheMetadata.entries[key] = {
    name: pkg.name,
    version: pkg.version,
    code: codePath,
    timestamp: Date.now(),
    metadata: metadata,
  };
  saveCacheMetadata(cacheDir, cacheMetadata);
}
/**
 * Clean up old cache entries
 */
function cleanupCache(cacheDir, maxAge) {
  if (maxAge === void 0) {
    maxAge = 7 * 24 * 60 * 60 * 1000;
  }
  var metadata = loadCacheMetadata(cacheDir);
  var now = Date.now();
  var cleaned = false;
  Object.keys(metadata.entries).forEach(function (key) {
    var entry = metadata.entries[key];
    if (now - entry.timestamp > maxAge) {
      // Remove from metadata
      delete metadata.entries[key];
      cleaned = true;
      // Try to remove the cached file
      try {
        var codePath = (0, path_1.join)(
          cacheDir,
          'packages',
          ''.concat(key, '.js'),
        );
        if ((0, fs_1.existsSync)(codePath)) {
          require('fs').unlinkSync(codePath);
        }
      } catch (_a) {
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
function getCacheStats(cacheDir) {
  if (!(0, fs_1.existsSync)(cacheDir)) {
    return { entries: 0, size: '0 B', lastCleanup: new Date() };
  }
  var metadata = loadCacheMetadata(cacheDir);
  var packagesDir = (0, path_1.join)(cacheDir, 'packages');
  var totalSize = 0;
  if ((0, fs_1.existsSync)(packagesDir)) {
    (0, fs_1.readdirSync)(packagesDir).forEach(function (file) {
      try {
        var stat = (0, fs_1.statSync)((0, path_1.join)(packagesDir, file));
        totalSize += stat.size;
      } catch (_a) {
        // Ignore stat errors
      }
    });
  }
  var formatSize = function (bytes) {
    var units = ['B', 'KB', 'MB', 'GB'];
    var size = bytes;
    var unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return ''.concat(size.toFixed(1), ' ').concat(units[unitIndex]);
  };
  return {
    entries: Object.keys(metadata.entries).length,
    size: formatSize(totalSize),
    lastCleanup: new Date(metadata.lastCleanup),
  };
}
