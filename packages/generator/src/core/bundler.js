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
Object.defineProperty(exports, '__esModule', { value: true });
exports.generateBundle = generateBundle;
var types_1 = require('../types');
/**
 * Generate IIFE bundle from flow configuration and resolved packages
 */
function generateBundle(config, resolvedPackages) {
  return __awaiter(this, void 0, void 0, function () {
    var packageCode, initCode, bundle;
    return __generator(this, function (_a) {
      try {
        packageCode = transformPackageCode(resolvedPackages);
        initCode = generateInitCode(config, resolvedPackages);
        bundle = createIIFEBundle(packageCode, initCode);
        return [2 /*return*/, bundle];
      } catch (error) {
        throw new types_1.BundleError('Failed to generate bundle', {
          error: error,
        });
      }
      return [2 /*return*/];
    });
  });
}
/**
 * Transform package code to IIFE-compatible format
 * Extracts clean package objects without CommonJS wrappers
 */
function transformPackageCode(resolvedPackages) {
  var packageSections = [];
  packageSections.push('// 1. PACKAGES CODE');
  packageSections.push('// Clean extracted package objects');
  // Get all packages for the dynamic require function
  var allPackages = resolvedPackages;
  for (
    var _i = 0, resolvedPackages_1 = resolvedPackages;
    _i < resolvedPackages_1.length;
    _i++
  ) {
    var resolved = resolvedPackages_1[_i];
    packageSections.push(
      '// '.concat(resolved.package.name, '@').concat(resolved.package.version),
    );
    // Extract clean package objects from the minified code
    var cleanCode = extractPackageObjects(resolved.code, resolved, allPackages);
    packageSections.push(cleanCode);
  }
  return packageSections.join('\n');
}
/**
 * Build dynamic require function from resolved packages
 */
function buildRequireFunction(allPackages) {
  var requireCases = allPackages
    .map(function (resolved) {
      var varName = sanitizeVariableName(resolved.package.name);
      return "    if (packageName === '"
        .concat(resolved.package.name, "') {\n      return ")
        .concat(varName, ' || {};\n    }');
    })
    .join('\n');
  return '\n  // Mock require function for cross-package dependencies\n  var require = function(packageName) {\n'.concat(
    requireCases,
    '\n    // Return empty object for unknown dependencies\n    return {};\n  };',
  );
}
/**
 * Extract real package exports from minified CommonJS code
 * Transforms the CommonJS module into browser-compatible variables
 */
function extractPackageObjects(code, resolved, allPackages) {
  var packageVariable = sanitizeVariableName(resolved.package.name);
  var requireFunction = buildRequireFunction(allPackages);
  // Transform the CommonJS module into an IIFE that exposes the exports
  // This avoids the "module is not defined" error in the browser
  var extractedCode = '\n// '
    .concat(resolved.package.name, '@')
    .concat(resolved.package.version, ' - REAL PACKAGE CODE\nvar ')
    .concat(
      packageVariable,
      ' = (function() {\n  // Create CommonJS environment\n  var module = { exports: {} };\n  var exports = module.exports;\n  ',
    )
    .concat(requireFunction, '\n  \n  // Execute the original package code\n  ')
    .concat(
      code,
      '\n  \n  // Return the exports\n  return module.exports;\n})();',
    );
  return extractedCode;
}
/**
 * Build package lookup map from resolved packages
 */
function buildPackageLookup(resolvedPackages) {
  var packageLookup = new Map();
  resolvedPackages.forEach(function (resolved) {
    // Use package name as variable name (sanitized)
    var varName = sanitizeVariableName(resolved.package.name);
    packageLookup.set(resolved.package.name, varName);
  });
  return packageLookup;
}
/**
 * Sanitize package name to valid JavaScript variable name
 */
function sanitizeVariableName(name) {
  // Replace invalid characters with underscores and ensure it starts with letter/underscore
  return name.replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^[^a-zA-Z_$]/, '_$&');
}
/**
 * Generate source configurations at build time
 */
function generateSourceConfigs(config, packageLookup) {
  if (!config.sources) return '';
  var sourceConfigs = Object.entries(config.sources)
    .map(function (_a) {
      var id = _a[0],
        source = _a[1];
      var sourceObj = source;
      // For now, assume the code refers to a package by name
      // In a real implementation, we'd need to resolve the actual source instance
      // to its package name. For this simplified version, we'll extract from
      // common source package names
      var pkgId;
      // Try to find matching package by common naming patterns
      for (
        var _i = 0, packageLookup_1 = packageLookup;
        _i < packageLookup_1.length;
        _i++
      ) {
        var _b = packageLookup_1[_i],
          name_1 = _b[0],
          varName = _b[1];
        if (
          name_1.includes('source') ||
          name_1.includes('browser') ||
          name_1.includes('datalayer')
        ) {
          pkgId = varName;
          break;
        }
      }
      if (!pkgId) {
        throw new Error('Could not resolve source package for '.concat(id));
      }
      var sourceConfig = '    "'.concat(id, '": { code: ').concat(pkgId);
      if (sourceObj.config) {
        sourceConfig += ', config: '.concat(JSON.stringify(sourceObj.config));
      }
      if (sourceObj.env) {
        sourceConfig += ', env: '.concat(JSON.stringify(sourceObj.env));
      }
      sourceConfig += ' }';
      return sourceConfig;
    })
    .join(',\n');
  return '  collectorConfig.sources = {\n'.concat(sourceConfigs, '\n  };');
}
/**
 * Generate destination configurations at build time
 */
function generateDestinationConfigs(config, packageLookup) {
  if (!config.destinations) return '';
  var destConfigs = Object.entries(config.destinations)
    .map(function (_a) {
      var id = _a[0],
        destination = _a[1];
      var destObj = destination;
      // For now, assume the code refers to a package by name
      // In a real implementation, we'd need to resolve the actual destination instance
      // to its package name. For this simplified version, we'll extract from
      // common destination package names
      var pkgId;
      // Try to find matching package by common naming patterns
      for (
        var _i = 0, packageLookup_2 = packageLookup;
        _i < packageLookup_2.length;
        _i++
      ) {
        var _b = packageLookup_2[_i],
          name_2 = _b[0],
          varName = _b[1];
        if (
          name_2.includes('destination') ||
          name_2.includes('gtag') ||
          name_2.includes('api')
        ) {
          pkgId = varName;
          break;
        }
      }
      if (!pkgId) {
        throw new Error(
          'Could not resolve destination package for '.concat(id),
        );
      }
      var destConfig = '    "'.concat(id, '": { code: ').concat(pkgId);
      if (destObj.config) {
        destConfig += ', config: '.concat(JSON.stringify(destObj.config));
      }
      if (destObj.env) {
        destConfig += ', env: '.concat(JSON.stringify(destObj.env));
      }
      destConfig += ' }';
      return destConfig;
    })
    .join(',\n');
  return '  collectorConfig.destinations = {\n'.concat(destConfigs, '\n  };');
}
/**
 * Find package variable name from code reference
 */
function findPackageVariable(codeRef, packageLookup) {
  // codeRef could be the package name or a variable reference
  // First try direct lookup
  if (packageLookup.has(codeRef)) {
    return packageLookup.get(codeRef);
  }
  // If it's already a variable reference, return as-is
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(codeRef)) {
    return codeRef;
  }
  return undefined;
}
/**
 * Generate walkerOS initialization code using static code generation
 * Pre-computes all configurations at build time for optimal runtime performance
 */
function generateInitCode(config, resolvedPackages) {
  var _a, _b;
  var packageLookup = buildPackageLookup(resolvedPackages);
  // Pre-compute base collector configuration
  var baseConfig = {
    run: (_a = config.run) !== null && _a !== void 0 ? _a : true,
    consent: config.consent,
    user: config.user,
    globals: config.globals,
    custom: config.custom,
    verbose: (_b = config.verbose) !== null && _b !== void 0 ? _b : false,
  };
  // Remove undefined values
  var cleanBaseConfig = Object.fromEntries(
    Object.entries(baseConfig).filter(function (_a) {
      var value = _a[1];
      return value !== undefined;
    }),
  );
  var baseCollectorConfig =
    Object.keys(cleanBaseConfig).length > 0
      ? JSON.stringify(cleanBaseConfig)
      : '{}';
  // Pre-compute source and destination configurations
  var sourceConfigs = generateSourceConfigs(config, packageLookup);
  var destConfigs = generateDestinationConfigs(config, packageLookup);
  // Get collector package ID
  var collectorPkgId = packageLookup.get('@walkeros/collector');
  if (!collectorPkgId) {
    throw new Error('Collector package not found in resolved packages');
  }
  // Generate minimal, static runtime code
  return '\nasync function initializeWalkerOS() {\n  const collectorConfig = Object.assign({}, '
    .concat(baseCollectorConfig, ');\n')
    .concat(sourceConfigs ? sourceConfigs : '', '\n')
    .concat(
      destConfigs ? destConfigs : '',
      '\n  const {collector, elb} = await ',
    )
    .concat(
      collectorPkgId,
      '.createCollector(collectorConfig);\n  return {collector, elb};\n}\n\nfunction initializeWhenReady() {\n  initializeWalkerOS().then(({collector, elb}) => {\n    window.walkerOS = collector;\n    window.elb = elb;\n  }).catch(error => {\n    console.error("WalkerOS initialization failed:", error);\n  });\n}\n\nif (document.readyState === "loading") {\n  document.addEventListener("DOMContentLoaded", initializeWhenReady);\n} else {\n  initializeWhenReady();\n}',
    )
    .trim();
}
/**
 * Create IIFE bundle wrapper for 4-part structure
 */
function createIIFEBundle(packageCode, initCode) {
  return "/*!\n * WalkerOS Bundle\n * Generated from Flow configuration\n */\n(function(window) {\n  'use strict';\n  \n  "
    .concat(packageCode, '\n  \n  ')
    .concat(initCode, "\n  \n})(typeof window !== 'undefined' ? window : {});");
}
