import { ParseError } from '../types';
import type { PackageDefinition, GeneratorConfig } from '../types';

/**
 * Parse and validate collector configuration
 */
export function parseCollectorConfig(input: unknown): GeneratorConfig {
  try {
    if (!input || typeof input !== 'object') {
      throw new ParseError('Collector config must be an object');
    }

    const config = input as Record<string, unknown>;

    // Validate sources if present
    if (config.sources && typeof config.sources !== 'object') {
      throw new ParseError('Sources must be an object');
    }

    if (config.sources) {
      validateSources(config.sources as Record<string, unknown>);
    }

    // Validate destinations if present
    if (config.destinations && typeof config.destinations !== 'object') {
      throw new ParseError('Destinations must be an object');
    }

    if (config.destinations) {
      validateDestinations(config.destinations as Record<string, unknown>);
    }

    return config as GeneratorConfig;
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }
    throw new ParseError('Unexpected error parsing collector config', {
      error,
    });
  }
}

/**
 * Parse and validate package definitions
 */
export function parsePackageDefinitions(input: unknown): PackageDefinition[] {
  try {
    if (!Array.isArray(input)) {
      throw new ParseError('Packages must be an array');
    }

    for (const [index, pkg] of input.entries()) {
      validatePackageDefinition(pkg, index);
    }

    return input as PackageDefinition[];
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }
    throw new ParseError('Unexpected error parsing package definitions', {
      error,
    });
  }
}

/**
 * Validate sources configuration
 */
function validateSources(sources: Record<string, unknown>): void {
  for (const [id, source] of Object.entries(sources)) {
    const prefix = `sources.${id}`;

    if (!source || typeof source !== 'object') {
      throw new ParseError(`${prefix} must be an object`);
    }

    const sourceObj = source as Record<string, unknown>;

    // Check for unified pattern: {code, config}
    if (!sourceObj.code) {
      throw new ParseError(
        `${prefix} must have a 'code' property (package reference)`,
      );
    }

    if (sourceObj.config && typeof sourceObj.config !== 'object') {
      throw new ParseError(`${prefix}.config must be an object`);
    }

    if (sourceObj.env && typeof sourceObj.env !== 'object') {
      throw new ParseError(`${prefix}.env must be an object`);
    }
  }
}

/**
 * Validate destinations configuration
 */
function validateDestinations(destinations: Record<string, unknown>): void {
  for (const [id, destination] of Object.entries(destinations)) {
    const prefix = `destinations.${id}`;

    if (!destination || typeof destination !== 'object') {
      throw new ParseError(`${prefix} must be an object`);
    }

    const destObj = destination as Record<string, unknown>;

    // Check for unified pattern: {code, config, env}
    if (!destObj.code) {
      throw new ParseError(
        `${prefix} must have a 'code' property (package reference)`,
      );
    }

    if (destObj.config && typeof destObj.config !== 'object') {
      throw new ParseError(`${prefix}.config must be an object`);
    }

    if (destObj.env && typeof destObj.env !== 'object') {
      throw new ParseError(`${prefix}.env must be an object`);
    }
  }
}

/**
 * Validate package definition
 */
function validatePackageDefinition(pkg: unknown, index: number): void {
  const prefix = `packages[${index}]`;

  if (!pkg || typeof pkg !== 'object') {
    throw new ParseError(`${prefix} must be an object`);
  }

  const packageObj = pkg as Record<string, unknown>;

  if (!packageObj.name || typeof packageObj.name !== 'string') {
    throw new ParseError(`${prefix} must have a name string`);
  }

  if (!packageObj.version || typeof packageObj.version !== 'string') {
    throw new ParseError(`${prefix} must have a version string`);
  }
}
