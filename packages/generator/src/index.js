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
exports.BundleError =
  exports.ResolveError =
  exports.ParseError =
  exports.GeneratorError =
  exports.generateBundle =
  exports.resolvePackages =
  exports.parsePackageDefinitions =
  exports.parseCollectorConfig =
    void 0;
exports.generateWalkerOSBundle = generateWalkerOSBundle;
var types_1 = require('./types');
var parser_1 = require('./core/parser');
var resolver_1 = require('./core/resolver');
var bundler_1 = require('./core/bundler');
/**
 * Generate walkerOS bundle from collector configuration
 */
function generateWalkerOSBundle(input) {
  return __awaiter(this, void 0, void 0, function () {
    var config, packages, resolvedPackages, bundle, error_1;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          _a.trys.push([0, 3, , 4]);
          config = (0, parser_1.parseCollectorConfig)(input.config);
          packages = (0, parser_1.parsePackageDefinitions)(input.packages);
          return [
            4 /*yield*/,
            (0, resolver_1.resolvePackages)(packages, input.cacheOptions),
          ];
        case 1:
          resolvedPackages = _a.sent();
          return [
            4 /*yield*/,
            (0, bundler_1.generateBundle)(config, resolvedPackages),
          ];
        case 2:
          bundle = _a.sent();
          return [2 /*return*/, { bundle: bundle }];
        case 3:
          error_1 = _a.sent();
          if (error_1 instanceof types_1.GeneratorError) {
            throw error_1;
          }
          throw new types_1.GeneratorError(
            'Unexpected error during bundle generation',
            'UNKNOWN_ERROR',
            { error: error_1 },
          );
        case 4:
          return [2 /*return*/];
      }
    });
  });
}
// Export utility functions
var parser_2 = require('./core/parser');
Object.defineProperty(exports, 'parseCollectorConfig', {
  enumerable: true,
  get: function () {
    return parser_2.parseCollectorConfig;
  },
});
Object.defineProperty(exports, 'parsePackageDefinitions', {
  enumerable: true,
  get: function () {
    return parser_2.parsePackageDefinitions;
  },
});
var resolver_2 = require('./core/resolver');
Object.defineProperty(exports, 'resolvePackages', {
  enumerable: true,
  get: function () {
    return resolver_2.resolvePackages;
  },
});
var bundler_2 = require('./core/bundler');
Object.defineProperty(exports, 'generateBundle', {
  enumerable: true,
  get: function () {
    return bundler_2.generateBundle;
  },
});
// Export error classes
var types_2 = require('./types');
Object.defineProperty(exports, 'GeneratorError', {
  enumerable: true,
  get: function () {
    return types_2.GeneratorError;
  },
});
Object.defineProperty(exports, 'ParseError', {
  enumerable: true,
  get: function () {
    return types_2.ParseError;
  },
});
Object.defineProperty(exports, 'ResolveError', {
  enumerable: true,
  get: function () {
    return types_2.ResolveError;
  },
});
Object.defineProperty(exports, 'BundleError', {
  enumerable: true,
  get: function () {
    return types_2.BundleError;
  },
});
