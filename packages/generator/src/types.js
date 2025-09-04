'use strict';
var __extends =
  (this && this.__extends) ||
  (function () {
    var extendStatics = function (d, b) {
      extendStatics =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (d, b) {
            d.__proto__ = b;
          }) ||
        function (d, b) {
          for (var p in b)
            if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
        };
      return extendStatics(d, b);
    };
    return function (d, b) {
      if (typeof b !== 'function' && b !== null)
        throw new TypeError(
          'Class extends value ' + String(b) + ' is not a constructor or null',
        );
      extendStatics(d, b);
      function __() {
        this.constructor = d;
      }
      d.prototype =
        b === null
          ? Object.create(b)
          : ((__.prototype = b.prototype), new __());
    };
  })();
Object.defineProperty(exports, '__esModule', { value: true });
exports.BundleError =
  exports.ResolveError =
  exports.ParseError =
  exports.GeneratorError =
    void 0;
var GeneratorError = /** @class */ (function (_super) {
  __extends(GeneratorError, _super);
  function GeneratorError(message, code, details) {
    var _this = _super.call(this, message) || this;
    _this.code = code;
    _this.details = details;
    _this.name = 'GeneratorError';
    return _this;
  }
  return GeneratorError;
})(Error);
exports.GeneratorError = GeneratorError;
var ParseError = /** @class */ (function (_super) {
  __extends(ParseError, _super);
  function ParseError(message, details) {
    var _this = _super.call(this, message, 'PARSE_ERROR', details) || this;
    _this.name = 'ParseError';
    return _this;
  }
  return ParseError;
})(GeneratorError);
exports.ParseError = ParseError;
var ResolveError = /** @class */ (function (_super) {
  __extends(ResolveError, _super);
  function ResolveError(message, details) {
    var _this = _super.call(this, message, 'RESOLVE_ERROR', details) || this;
    _this.name = 'ResolveError';
    return _this;
  }
  return ResolveError;
})(GeneratorError);
exports.ResolveError = ResolveError;
var BundleError = /** @class */ (function (_super) {
  __extends(BundleError, _super);
  function BundleError(message, details) {
    var _this = _super.call(this, message, 'BUNDLE_ERROR', details) || this;
    _this.name = 'BundleError';
    return _this;
  }
  return BundleError;
})(GeneratorError);
exports.BundleError = BundleError;
