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
 * Convert package name to valid JavaScript variable name.
 * Used for deterministic default import naming.
 * @example
 * packageNameToVariable('@walkeros/server-destination-api')
 * // → '_walkerosServerDestinationApi'
 */
export function packageNameToVariable(packageName: string): string {
  const hasScope = packageName.startsWith('@');
  const normalized = packageName
    .replace('@', '')
    .replace(/[/-]/g, '_')
    .split('_')
    .filter((part) => part.length > 0)
    .map((part, i) =>
      i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join('');

  return hasScope ? '_' + normalized : normalized;
}

/**
 * Resolve code from package reference.
 * Preserves explicit code fields, or auto-generates from package name.
 */
function resolveCodeFromPackage(
  packageName: string | undefined,
  existingCode: string | undefined,
  packages: Flow.Packages | undefined,
): string | undefined {
  // Preserve explicit code first
  if (existingCode) return existingCode;

  // Auto-generate code from package name if package exists
  if (!packageName || !packages) return undefined;

  const pkgConfig = packages[packageName];
  if (!pkgConfig) return undefined;

  return packageNameToVariable(packageName);
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
 * Get resolved flow configuration for a named flow.
 *
 * @param setup - The complete setup configuration
 * @param flowName - Flow name (auto-selected if only one exists)
 * @returns Resolved Config with variables/definitions interpolated and $refs resolved
 * @throws Error if flow selection is required but not specified, or flow not found
 *
 * @example
 * ```typescript
 * import { getFlowConfig } from '@walkeros/core';
 *
 * const setup = JSON.parse(fs.readFileSync('walkeros.config.json', 'utf8'));
 *
 * // Auto-select if only one flow
 * const config = getFlowConfig(setup);
 *
 * // Or specify flow
 * const prodConfig = getFlowConfig(setup, 'production');
 * ```
 */
export function getFlowConfig(
  setup: Flow.Setup,
  flowName?: string,
): Flow.Config {
  const flowNames = Object.keys(setup.flows);

  // Auto-select if only one flow
  if (!flowName) {
    if (flowNames.length === 1) {
      flowName = flowNames[0];
    } else {
      throw new Error(
        `Multiple flows found (${flowNames.join(', ')}). Please specify a flow.`,
      );
    }
  }

  // Check flow exists
  const config = setup.flows[flowName];
  if (!config) {
    throw new Error(
      `Flow "${flowName}" not found. Available: ${flowNames.join(', ')}`,
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

      // Resolve code from package reference
      const resolvedCode = resolveCodeFromPackage(
        source.package,
        source.code,
        result.packages,
      );

      result.sources[name] = {
        ...source,
        config: processedConfig,
        ...(resolvedCode && { code: resolvedCode }),
      };
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

      // Resolve code from package reference
      const resolvedCode = resolveCodeFromPackage(
        dest.package,
        dest.code,
        result.packages,
      );

      result.destinations[name] = {
        ...dest,
        config: processedConfig,
        ...(resolvedCode && { code: resolvedCode }),
      };
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
