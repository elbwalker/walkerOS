'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g = Object.create(
        (typeof Iterator === 'function' ? Iterator : Object).prototype,
      );
    return (
      (g.next = verb(0)),
      (g['throw'] = verb(1)),
      (g['return'] = verb(2)),
      typeof Symbol === 'function' &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError('Generator is already executing.');
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y['return']
                  : op[0]
                    ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                    : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
var __spreadArray =
  (this && this.__spreadArray) ||
  function (to, from, pack) {
    if (pack || arguments.length === 2)
      for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.resolvePackages = resolvePackages;
var semver_1 = require('semver');
var types_1 = require('../types');
var cache_1 = require('./cache');
var util_1 = require('util');
var child_process_1 = require('child_process');
var fs_1 = require('fs');
var path_1 = require('path');
var os_1 = require('os');
var execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Resolve packages from Flow configuration
 */
function resolvePackages(packages, cacheOptions) {
  return __awaiter(this, void 0, void 0, function () {
    var resolved,
      cacheDir,
      buildDir,
      sortedPackages,
      _i,
      sortedPackages_1,
      pkg,
      code,
      error_1;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          _a.trys.push([0, 5, , 6]);
          resolved = [];
          cacheDir = void 0;
          buildDir = void 0;
          if (
            (cacheOptions === null || cacheOptions === void 0
              ? void 0
              : cacheOptions.cacheDir) &&
            !cacheOptions.noCache
          ) {
            cacheDir = (0, cache_1.getCacheDir)(cacheOptions.cacheDir);
            // Clean up old cache entries periodically
            (0, cache_1.cleanupCache)(cacheDir);
          }
          if (
            cacheOptions === null || cacheOptions === void 0
              ? void 0
              : cacheOptions.buildDir
          ) {
            buildDir = (0, cache_1.getBuildDir)(cacheOptions.buildDir);
            // Clean build directory if requested
            if (cacheOptions.clean) {
              console.log('🧹 Cleaning build directory...');
              (0, cache_1.cleanBuildDir)(buildDir);
              // Recreate the directory
              buildDir = (0, cache_1.getBuildDir)(cacheOptions.buildDir);
            }
          }
          sortedPackages = sortPackagesByName(packages);
          ((_i = 0), (sortedPackages_1 = sortedPackages));
          _a.label = 1;
        case 1:
          if (!(_i < sortedPackages_1.length)) return [3 /*break*/, 4];
          pkg = sortedPackages_1[_i];
          return [
            4 /*yield*/,
            resolvePackageCode(pkg, cacheDir, buildDir, cacheOptions),
          ];
        case 2:
          code = _a.sent();
          resolved.push({
            package: pkg,
            code: code,
          });
          _a.label = 3;
        case 3:
          _i++;
          return [3 /*break*/, 1];
        case 4:
          return [2 /*return*/, resolved];
        case 5:
          error_1 = _a.sent();
          if (error_1 instanceof types_1.ResolveError) {
            throw error_1;
          }
          throw new types_1.ResolveError('Failed to resolve packages', {
            error: error_1,
          });
        case 6:
          return [2 /*return*/];
      }
    });
  });
}
/**
 * Sort packages alphabetically by name
 */
function sortPackagesByName(packages) {
  return __spreadArray([], packages, true).sort(function (a, b) {
    return a.name.localeCompare(b.name);
  });
}
/**
 * Resolve package code from package specification
 */
function resolvePackageCode(pkg, cacheDir, buildDir, options) {
  return __awaiter(this, void 0, void 0, function () {
    var extractedCode,
      metadata,
      metadata,
      packageCode,
      workingDir,
      packagePath,
      extractedCode,
      key,
      extractedPath,
      error_2,
      errorMessage,
      suggestions,
      fullMessage;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          validateVersion(pkg.version);
          // Priority 1: Check package cache first (unless noCache is true)
          if (
            cacheDir &&
            !(options === null || options === void 0
              ? void 0
              : options.noCache) &&
            (0, cache_1.isCached)(pkg, cacheDir)
          ) {
            console.log(
              '\uD83D\uDCE6 Using cached package: '
                .concat(pkg.name, '@')
                .concat(pkg.version),
            );
            return [2 /*return*/, (0, cache_1.getCachedCode)(pkg, cacheDir)];
          }
          if (!(buildDir && (0, cache_1.isPackageExtracted)(pkg, buildDir)))
            return [3 /*break*/, 3];
          console.log(
            '\uD83D\uDD27 Using extracted package: '
              .concat(pkg.name, '@')
              .concat(pkg.version),
          );
          extractedCode = (0, cache_1.getExtractedCode)(pkg, buildDir);
          if (
            !(
              cacheDir &&
              !(options === null || options === void 0
                ? void 0
                : options.noCache)
            )
          )
            return [3 /*break*/, 2];
          return [4 /*yield*/, fetchPackageMetadata(pkg.name, pkg.version)];
        case 1:
          metadata = _a.sent();
          (0, cache_1.cachePackageCode)(pkg, extractedCode, cacheDir, metadata);
          _a.label = 2;
        case 2:
          return [2 /*return*/, extractedCode];
        case 3:
          _a.trys.push([3, 13, , 14]);
          return [4 /*yield*/, fetchPackageMetadata(pkg.name, pkg.version)];
        case 4:
          metadata = _a.sent();
          packageCode = void 0;
          workingDir = void 0;
          if (!buildDir) return [3 /*break*/, 8];
          // Use persistent build directory
          workingDir = buildDir;
          if (!(0, cache_1.isPackageInstalled)(pkg, buildDir))
            return [3 /*break*/, 5];
          console.log(
            '\u267B\uFE0F  Reusing installed package: '
              .concat(pkg.name, '@')
              .concat(pkg.version),
          );
          packagePath = (0, path_1.join)(buildDir, 'node_modules', pkg.name);
          extractedCode = extractPackageCode(packagePath, metadata);
          packageCode = transformESModuleToCommonJS(extractedCode);
          key = (0, cache_1.getCacheKey)(pkg);
          extractedPath = (0, path_1.join)(
            buildDir,
            'extracted',
            ''.concat(key, '.js'),
          );
          require('fs').mkdirSync((0, path_1.join)(buildDir, 'extracted'), {
            recursive: true,
          });
          require('fs').writeFileSync(extractedPath, packageCode);
          return [3 /*break*/, 7];
        case 5:
          console.log(
            '\u2B07\uFE0F  Installing package: '
              .concat(pkg.name, '@')
              .concat(pkg.version),
          );
          return [
            4 /*yield*/,
            installAndExtractPackage(metadata, workingDir, buildDir),
          ];
        case 6:
          packageCode = _a.sent();
          _a.label = 7;
        case 7:
          return [3 /*break*/, 12];
        case 8:
          // Use temporary directory (old behavior)
          workingDir = (0, fs_1.mkdtempSync)(
            (0, path_1.join)((0, os_1.tmpdir)(), 'walkeros-generator-'),
          );
          _a.label = 9;
        case 9:
          _a.trys.push([9, , 11, 12]);
          return [4 /*yield*/, installAndExtractPackage(metadata, workingDir)];
        case 10:
          packageCode = _a.sent();
          return [3 /*break*/, 12];
        case 11:
          // Clean up temp directory
          (0, fs_1.rmSync)(workingDir, { recursive: true, force: true });
          return [7 /*endfinally*/];
        case 12:
          // Cache the resolved package code (unless noCache is true)
          if (
            cacheDir &&
            !(options === null || options === void 0 ? void 0 : options.noCache)
          ) {
            (0, cache_1.cachePackageCode)(pkg, packageCode, cacheDir, metadata);
          }
          return [2 /*return*/, packageCode];
        case 13:
          error_2 = _a.sent();
          errorMessage = 'Failed to resolve package '
            .concat(pkg.name, '@')
            .concat(pkg.version);
          suggestions = [];
          if (error_2 instanceof types_1.ResolveError) {
            errorMessage += ': '.concat(error_2.message);
            // Add specific suggestions based on the error details
            if (error_2.message.includes('Failed to fetch metadata')) {
              suggestions.push(
                '• Check if the package name and version are correct',
              );
              suggestions.push('• Verify network connectivity to npm registry');
              suggestions.push(
                '• Try running: npm view ${pkg.name}@${pkg.version}',
              );
            } else if (error_2.message.includes('Failed to install/extract')) {
              suggestions.push(
                '• Ensure npm is properly installed and configured',
              );
              suggestions.push(
                '• Check if the package version exists on npm registry',
              );
              suggestions.push(
                '• Try clearing npm cache: npm cache clean --force',
              );
            } else if (error_2.message.includes('No valid entry point found')) {
              suggestions.push(
                '• The package may not be compatible with this generator',
              );
              suggestions.push(
                '• Check if the package has a valid main/module entry point',
              );
            }
          } else {
            errorMessage += ': '.concat(error_2);
            suggestions.push('• Check package name and version are correct');
            suggestions.push('• Ensure network connectivity');
            suggestions.push('• Verify npm is properly configured');
          }
          // Add general troubleshooting suggestions
          suggestions.push('• Run with --verbose flag for more details');
          if (buildDir) {
            suggestions.push('• Try with --clean flag to force fresh download');
          }
          fullMessage =
            suggestions.length > 0
              ? ''
                  .concat(errorMessage, '\n\nTroubleshooting suggestions:\n')
                  .concat(suggestions.join('\n'))
              : errorMessage;
          throw new types_1.ResolveError(fullMessage, {
            originalError: error_2,
            packageName: pkg.name,
            packageVersion: pkg.version,
          });
        case 14:
          return [2 /*return*/];
      }
    });
  });
}
/**
 * Fetch package metadata from npm registry
 */
function fetchPackageMetadata(name, version) {
  return __awaiter(this, void 0, void 0, function () {
    var versionSpec, command, stdout, data, packageData, error_3;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          _a.trys.push([0, 2, , 3]);
          versionSpec = version === 'latest' ? '' : '@'.concat(version);
          command = 'npm view '.concat(name).concat(versionSpec, ' --json');
          return [4 /*yield*/, execAsync(command)];
        case 1:
          stdout = _a.sent().stdout;
          data = JSON.parse(stdout);
          packageData = Array.isArray(data) ? data[0] : data;
          return [
            2 /*return*/,
            {
              name: packageData.name,
              version: packageData.version,
              dist: packageData.dist,
              main: packageData.main,
              module: packageData.module,
              exports: packageData.exports,
            },
          ];
        case 2:
          error_3 = _a.sent();
          throw new types_1.ResolveError(
            'Failed to fetch metadata for '.concat(name, '@').concat(version),
            {
              error: error_3,
            },
          );
        case 3:
          return [2 /*return*/];
      }
    });
  });
}
/**
 * Install package to temporary directory and extract code
 */
function installAndExtractPackage(metadata, tempDir, buildDir) {
  return __awaiter(this, void 0, void 0, function () {
    var packageJsonPath,
      minimalPackageJson,
      installCommand,
      startTime,
      execPromise,
      _a,
      stdout,
      stderr,
      endTime,
      installError_1,
      errorMessage,
      packagePath,
      extractedCode,
      extractedPath,
      error_4;
    return __generator(this, function (_b) {
      switch (_b.label) {
        case 0:
          _b.trys.push([0, 5, , 6]);
          packageJsonPath = (0, path_1.join)(tempDir, 'package.json');
          minimalPackageJson = {
            name: 'walkeros-temp-install',
            version: '1.0.0',
            private: true,
          };
          require('fs').writeFileSync(
            packageJsonPath,
            JSON.stringify(minimalPackageJson, null, 2),
          );
          installCommand = 'npm install '
            .concat(metadata.name, '@')
            .concat(metadata.version);
          console.log(
            '\uD83D\uDCE6 Installing '
              .concat(metadata.name, '@')
              .concat(metadata.version, '...'),
          );
          _b.label = 1;
        case 1:
          _b.trys.push([1, 3, , 4]);
          startTime = Date.now();
          execPromise = execAsync(installCommand, {
            cwd: tempDir,
            timeout: process.env.NODE_ENV === 'test' ? 5000 : 60000, // 5s for tests, 60s for production
          });
          return [4 /*yield*/, execPromise];
        case 2:
          ((_a = _b.sent()), (stdout = _a.stdout), (stderr = _a.stderr));
          endTime = Date.now();
          console.log(
            '\u23F1\uFE0F  Command completed in '.concat(
              endTime - startTime,
              'ms',
            ),
          );
          if (stderr && !stderr.includes('npm WARN')) {
            console.warn(
              'npm install warnings for '.concat(metadata.name, ':'),
              stderr,
            );
          }
          if (stdout) {
            console.log(
              '\u2705 Successfully installed '
                .concat(metadata.name, '@')
                .concat(metadata.version),
            );
          }
          return [3 /*break*/, 4];
        case 3:
          installError_1 = _b.sent();
          errorMessage =
            installError_1 instanceof Error
              ? installError_1.message
              : String(installError_1);
          console.error(
            '\u274C npm install failed for '
              .concat(metadata.name, '@')
              .concat(metadata.version, ':'),
            errorMessage,
          );
          // Re-throw with more specific error information
          throw new Error('npm install failed: '.concat(errorMessage));
        case 4:
          packagePath = (0, path_1.join)(
            tempDir,
            'node_modules',
            metadata.name,
          );
          extractedCode = extractPackageCode(packagePath, metadata);
          // If using build directory, save the extracted code for inspection
          if (buildDir) {
            extractedPath = (0, path_1.join)(
              buildDir,
              'extracted',
              ''.concat(metadata.name.replace(/[\/\\:]/g, '_'), '.js'),
            );
            require('fs').mkdirSync((0, path_1.join)(buildDir, 'extracted'), {
              recursive: true,
            });
            require('fs').writeFileSync(extractedPath, extractedCode);
          }
          // Transform ES modules to IIFE-compatible format
          return [2 /*return*/, transformESModuleToCommonJS(extractedCode)];
        case 5:
          error_4 = _b.sent();
          throw new types_1.ResolveError(
            'Failed to install/extract '
              .concat(metadata.name, '@')
              .concat(metadata.version),
            { error: error_4 },
          );
        case 6:
          return [2 /*return*/];
      }
    });
  });
}
/**
 * Extract package code from installed package
 */
function extractPackageCode(packagePath, metadata) {
  // Try different entry points in order of preference
  var entryPoints = [
    // 1. Check dist/index.js (CJS)
    (0, path_1.join)(packagePath, 'dist', 'index.js'),
    // 2. Check main field from package.json
    metadata.main ? (0, path_1.join)(packagePath, metadata.main) : null,
    // 3. Check module field (ESM)
    metadata.module ? (0, path_1.join)(packagePath, metadata.module) : null,
    // 4. Default index.js
    (0, path_1.join)(packagePath, 'index.js'),
    // 5. Check dist directory for any JS files
    (0, path_1.join)(packagePath, 'dist', 'index.mjs'),
  ].filter(Boolean);
  for (
    var _i = 0, entryPoints_1 = entryPoints;
    _i < entryPoints_1.length;
    _i++
  ) {
    var entryPoint = entryPoints_1[_i];
    if ((0, fs_1.existsSync)(entryPoint)) {
      try {
        return (0, fs_1.readFileSync)(entryPoint, 'utf-8');
      } catch (error) {
        console.warn('Failed to read '.concat(entryPoint, ':'), error);
        continue;
      }
    }
  }
  throw new types_1.ResolveError(
    'No valid entry point found for '.concat(metadata.name),
    {
      packagePath: packagePath,
      triedPaths: entryPoints,
    },
  );
}
/**
 * Validate version format
 */
function validateVersion(version) {
  if (version === 'latest' || version === 'mock') {
    return; // Allow these special versions
  }
  if (
    !(0, semver_1.valid)(version) &&
    !version.includes('*') &&
    !version.includes('^') &&
    !version.includes('~')
  ) {
    throw new types_1.ResolveError('Invalid version format: '.concat(version));
  }
}
/**
 * Transform ES module syntax to CommonJS/IIFE compatible format
 */
function transformESModuleToCommonJS(code) {
  return code
    .replace(/export const (\w+) = /g, 'const $1 = ')
    .replace(/export function (\w+)/g, 'function $1')
    .replace(/export \{[^}]+\}/g, '') // Remove export statements
    .replace(/import .*/g, '') // Remove import statements
    .trim();
}
