/**
 * Flow Configuration Utilities
 *
 * Functions for resolving and processing Flow configurations.
 *
 * @packageDocumentation
 */

import type { Flow } from './types';

/**
 * Merge variables with cascade priority.
 * Later arguments have higher priority.
 */
function mergeVariables(
  ...sources: (Flow.Variables | undefined)[]
): Flow.Variables {
  const result: Flow.Variables = {};
  for (const source of sources) {
    if (source) {
      Object.assign(result, source);
    }
  }
  return result;
}

/**
 * Merge definitions with cascade priority.
 * Later arguments have higher priority.
 */
function mergeDefinitions(
  ...sources: (Flow.Definitions | undefined)[]
): Flow.Definitions {
  const result: Flow.Definitions = {};
  for (const source of sources) {
    if (source) {
      Object.assign(result, source);
    }
  }
  return result;
}

/**
 * Interpolate variables in a value.
 * Syntax: ${VAR_NAME} or ${VAR_NAME:default}
 */
function interpolateVariables(
  value: unknown,
  variables: Flow.Variables,
): unknown {
  if (typeof value === 'string') {
    return value.replace(
      /\$\{([^}:]+)(?::([^}]*))?\}/g,
      (match, name, defaultValue) => {
        // Check process.env first
        if (
          typeof process !== 'undefined' &&
          process.env?.[name] !== undefined
        ) {
          return process.env[name]!;
        }
        // Then check variables
        if (variables[name] !== undefined) {
          return String(variables[name]);
        }
        // Use default if provided
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        // Throw for required variable
        throw new Error(`Variable "${name}" not found and no default provided`);
      },
    );
  }

  if (Array.isArray(value)) {
    return value.map((item) => interpolateVariables(item, variables));
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = interpolateVariables(val, variables);
    }
    return result;
  }

  return value;
}

/**
 * Resolve $ref references in a value.
 */
function resolveRefs(value: unknown, definitions: Flow.Definitions): unknown {
  if (value !== null && typeof value === 'object') {
    // Check if this is a $ref object
    if (
      '$ref' in value &&
      typeof (value as Record<string, unknown>).$ref === 'string'
    ) {
      const ref = (value as Record<string, unknown>).$ref as string;
      const match = ref.match(/^#\/definitions\/(.+)$/);
      if (match) {
        const defName = match[1];
        if (definitions[defName] === undefined) {
          throw new Error(`Definition "${defName}" not found`);
        }
        return resolveRefs(definitions[defName], definitions);
      }
      throw new Error(`Invalid $ref format: ${ref}`);
    }

    // Recursively process object
    if (Array.isArray(value)) {
      return value.map((item) => resolveRefs(item, definitions));
    }

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = resolveRefs(val, definitions);
    }
    return result;
  }

  return value;
}

/**
 * Get resolved flow configuration for an environment.
 *
 * @param setup - The complete setup configuration
 * @param environment - Environment name (auto-selected if only one exists)
 * @returns Resolved Config with variables/definitions interpolated and $refs resolved
 * @throws Error if environment is required but not specified, or not found
 *
 * @example
 * ```typescript
 * import { getFlowConfig } from '@walkeros/core';
 *
 * const setup = JSON.parse(fs.readFileSync('walkeros.config.json', 'utf8'));
 *
 * // Auto-select if only one environment
 * const config = getFlowConfig(setup);
 *
 * // Or specify environment
 * const prodConfig = getFlowConfig(setup, 'production');
 * ```
 */
export function getFlowConfig(
  setup: Flow.Setup,
  environment?: string,
): Flow.Config {
  const envNames = Object.keys(setup.environments);

  // Auto-select if only one environment
  if (!environment) {
    if (envNames.length === 1) {
      environment = envNames[0];
    } else {
      throw new Error(
        `Multiple environments found (${envNames.join(', ')}). Please specify an environment.`,
      );
    }
  }

  // Check environment exists
  const config = setup.environments[environment];
  if (!config) {
    throw new Error(
      `Environment "${environment}" not found. Available: ${envNames.join(', ')}`,
    );
  }

  // Deep clone to avoid mutations
  const result = JSON.parse(JSON.stringify(config)) as Flow.Config;

  // Process sources with variable and definition cascade
  if (result.sources) {
    for (const [name, source] of Object.entries(result.sources)) {
      const vars = mergeVariables(
        setup.variables,
        config.variables,
        source.variables,
      );
      const defs = mergeDefinitions(
        setup.definitions,
        config.definitions,
        source.definitions,
      );

      let processedConfig = resolveRefs(source.config, defs);
      processedConfig = interpolateVariables(processedConfig, vars);

      result.sources[name] = { ...source, config: processedConfig };
    }
  }

  // Process destinations with variable and definition cascade
  if (result.destinations) {
    for (const [name, dest] of Object.entries(result.destinations)) {
      const vars = mergeVariables(
        setup.variables,
        config.variables,
        dest.variables,
      );
      const defs = mergeDefinitions(
        setup.definitions,
        config.definitions,
        dest.definitions,
      );

      let processedConfig = resolveRefs(dest.config, defs);
      processedConfig = interpolateVariables(processedConfig, vars);

      result.destinations[name] = { ...dest, config: processedConfig };
    }
  }

  // Process collector config
  if (result.collector) {
    const vars = mergeVariables(setup.variables, config.variables);
    const defs = mergeDefinitions(setup.definitions, config.definitions);

    let processedCollector = resolveRefs(result.collector, defs);
    processedCollector = interpolateVariables(processedCollector, vars);
    result.collector = processedCollector as typeof result.collector;
  }

  return result;
}

/**
 * Get platform from config (web or server).
 *
 * @param config - Flow configuration
 * @returns "web" or "server"
 * @throws Error if neither web nor server is present
 *
 * @example
 * ```typescript
 * import { getPlatform } from '@walkeros/core';
 *
 * const platform = getPlatform(config);
 * // Returns "web" or "server"
 * ```
 */
export function getPlatform(config: Flow.Config): 'web' | 'server' {
  if (config.web !== undefined) return 'web';
  if (config.server !== undefined) return 'server';
  throw new Error('Config must have web or server key');
}
