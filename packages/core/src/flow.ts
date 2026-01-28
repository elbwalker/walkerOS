/**
 * Flow Configuration Utilities
 *
 * Functions for resolving and processing Flow configurations.
 *
 * @packageDocumentation
 */

import type { Flow } from './types';
import { throwError } from './throwError';

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
 * Resolve all dynamic patterns in a value.
 *
 * Patterns:
 * - $def.name → Look up definitions[name], replace entire value with definition content
 * - $var.name → Look up variables[name]
 * - $env.NAME or $env.NAME:default → Look up process.env[NAME]
 */
function resolvePatterns(
  value: unknown,
  variables: Flow.Variables,
  definitions: Flow.Definitions,
): unknown {
  if (typeof value === 'string') {
    // Check if entire string is a $def.name reference (replaces whole value)
    const defMatch = value.match(/^\$def\.([a-zA-Z_][a-zA-Z0-9_]*)$/);
    if (defMatch) {
      const defName = defMatch[1];
      if (definitions[defName] === undefined) {
        throwError(`Definition "${defName}" not found`);
      }
      // Return the definition content (recursively resolved)
      return resolvePatterns(definitions[defName], variables, definitions);
    }

    // Replace $var.name patterns (inline substitution)
    let result = value.replace(
      /\$var\.([a-zA-Z_][a-zA-Z0-9_]*)/g,
      (match, name) => {
        if (variables[name] !== undefined) {
          return String(variables[name]);
        }
        throwError(`Variable "${name}" not found`);
      },
    );

    // Replace $env.NAME or $env.NAME:default patterns
    result = result.replace(
      /\$env\.([a-zA-Z_][a-zA-Z0-9_]*)(?::([^"}\s]*))?/g,
      (match, name, defaultValue) => {
        if (
          typeof process !== 'undefined' &&
          process.env?.[name] !== undefined
        ) {
          return process.env[name]!;
        }
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        throwError(
          `Environment variable "${name}" not found and no default provided`,
        );
      },
    );

    return result;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolvePatterns(item, variables, definitions));
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = resolvePatterns(val, variables, definitions);
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
  existingCode: string | Flow.InlineCode | undefined,
  packages: Flow.Packages | undefined,
): string | Flow.InlineCode | undefined {
  // Preserve explicit code first (including InlineCode objects)
  if (existingCode) return existingCode;

  // Auto-generate code from package name if package exists
  if (!packageName || !packages) return undefined;

  const pkgConfig = packages[packageName];
  if (!pkgConfig) return undefined;

  return packageNameToVariable(packageName);
}

/**
 * Get resolved flow configuration for a named flow.
 *
 * @param setup - The complete setup configuration
 * @param flowName - Flow name (auto-selected if only one exists)
 * @returns Resolved Config with $var, $env, and $def patterns resolved
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
      throwError(
        `Multiple flows found (${flowNames.join(', ')}). Please specify a flow.`,
      );
    }
  }

  // Check flow exists
  const config = setup.flows[flowName];
  if (!config) {
    throwError(
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

      const processedConfig = resolvePatterns(source.config, vars, defs);

      // Resolve code from package reference
      const resolvedCode = resolveCodeFromPackage(
        source.package,
        source.code,
        result.packages,
      );

      // Exclude deprecated code: true, only keep valid string or InlineCode
      const validCode =
        typeof source.code === 'string' || typeof source.code === 'object'
          ? source.code
          : undefined;
      const finalCode = resolvedCode || validCode;
      result.sources[name] = {
        package: source.package,
        config: processedConfig,
        env: source.env,
        primary: source.primary,
        variables: source.variables,
        definitions: source.definitions,
        next: source.next,
        code: finalCode,
      } as Flow.SourceReference;
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

      const processedConfig = resolvePatterns(dest.config, vars, defs);

      // Resolve code from package reference
      const resolvedCode = resolveCodeFromPackage(
        dest.package,
        dest.code,
        result.packages,
      );

      // Exclude deprecated code: true, only keep valid string or InlineCode
      const validCode =
        typeof dest.code === 'string' || typeof dest.code === 'object'
          ? dest.code
          : undefined;
      const finalCode = resolvedCode || validCode;
      result.destinations[name] = {
        package: dest.package,
        config: processedConfig,
        env: dest.env,
        variables: dest.variables,
        definitions: dest.definitions,
        before: dest.before,
        code: finalCode,
      } as Flow.DestinationReference;
    }
  }

  // Process collector config
  if (result.collector) {
    const vars = mergeVariables(setup.variables, config.variables);
    const defs = mergeDefinitions(setup.definitions, config.definitions);

    const processedCollector = resolvePatterns(result.collector, vars, defs);
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
  throwError('Config must have web or server key');
}
