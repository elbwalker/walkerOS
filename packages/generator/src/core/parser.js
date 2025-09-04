'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.parseCollectorConfig = parseCollectorConfig;
exports.parsePackageDefinitions = parsePackageDefinitions;
var types_1 = require('../types');
/**
 * Parse and validate collector configuration
 */
function parseCollectorConfig(input) {
  try {
    if (!input || typeof input !== 'object') {
      throw new types_1.ParseError('Collector config must be an object');
    }
    var config = input;
    // Validate sources if present
    if (config.sources && typeof config.sources !== 'object') {
      throw new types_1.ParseError('Sources must be an object');
    }
    if (config.sources) {
      validateSources(config.sources);
    }
    // Validate destinations if present
    if (config.destinations && typeof config.destinations !== 'object') {
      throw new types_1.ParseError('Destinations must be an object');
    }
    if (config.destinations) {
      validateDestinations(config.destinations);
    }
    return config;
  } catch (error) {
    if (error instanceof types_1.ParseError) {
      throw error;
    }
    throw new types_1.ParseError('Unexpected error parsing collector config', {
      error: error,
    });
  }
}
/**
 * Parse and validate package definitions
 */
function parsePackageDefinitions(input) {
  try {
    if (!Array.isArray(input)) {
      throw new types_1.ParseError('Packages must be an array');
    }
    for (var _i = 0, _a = input.entries(); _i < _a.length; _i++) {
      var _b = _a[_i],
        index = _b[0],
        pkg = _b[1];
      validatePackageDefinition(pkg, index);
    }
    return input;
  } catch (error) {
    if (error instanceof types_1.ParseError) {
      throw error;
    }
    throw new types_1.ParseError(
      'Unexpected error parsing package definitions',
      { error: error },
    );
  }
}
/**
 * Validate sources configuration
 */
function validateSources(sources) {
  for (var _i = 0, _a = Object.entries(sources); _i < _a.length; _i++) {
    var _b = _a[_i],
      id = _b[0],
      source = _b[1];
    var prefix = 'sources.'.concat(id);
    if (!source || typeof source !== 'object') {
      throw new types_1.ParseError(''.concat(prefix, ' must be an object'));
    }
    var sourceObj = source;
    // Check for unified pattern: {code, config}
    if (!sourceObj.code) {
      throw new types_1.ParseError(
        ''.concat(prefix, " must have a 'code' property (package reference)"),
      );
    }
    if (sourceObj.config && typeof sourceObj.config !== 'object') {
      throw new types_1.ParseError(
        ''.concat(prefix, '.config must be an object'),
      );
    }
    if (sourceObj.env && typeof sourceObj.env !== 'object') {
      throw new types_1.ParseError(''.concat(prefix, '.env must be an object'));
    }
  }
}
/**
 * Validate destinations configuration
 */
function validateDestinations(destinations) {
  for (var _i = 0, _a = Object.entries(destinations); _i < _a.length; _i++) {
    var _b = _a[_i],
      id = _b[0],
      destination = _b[1];
    var prefix = 'destinations.'.concat(id);
    if (!destination || typeof destination !== 'object') {
      throw new types_1.ParseError(''.concat(prefix, ' must be an object'));
    }
    var destObj = destination;
    // Check for unified pattern: {code, config, env}
    if (!destObj.code) {
      throw new types_1.ParseError(
        ''.concat(prefix, " must have a 'code' property (package reference)"),
      );
    }
    if (destObj.config && typeof destObj.config !== 'object') {
      throw new types_1.ParseError(
        ''.concat(prefix, '.config must be an object'),
      );
    }
    if (destObj.env && typeof destObj.env !== 'object') {
      throw new types_1.ParseError(''.concat(prefix, '.env must be an object'));
    }
  }
}
/**
 * Validate package definition
 */
function validatePackageDefinition(pkg, index) {
  var prefix = 'packages['.concat(index, ']');
  if (!pkg || typeof pkg !== 'object') {
    throw new types_1.ParseError(''.concat(prefix, ' must be an object'));
  }
  var packageObj = pkg;
  if (!packageObj.name || typeof packageObj.name !== 'string') {
    throw new types_1.ParseError(''.concat(prefix, ' must have a name string'));
  }
  if (!packageObj.version || typeof packageObj.version !== 'string') {
    throw new types_1.ParseError(
      ''.concat(prefix, ' must have a version string'),
    );
  }
}
