/**
 * Flow Configuration Utilities
 *
 * Functions for resolving and processing Flow configurations.
 *
 * @packageDocumentation
 */

import type { Flow } from './types';
import { resolveContracts } from './contract';
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

/** Sentinel prefix for deferred $env resolution. Shared with CLI bundler. */
export const ENV_MARKER_PREFIX = '__WALKEROS_ENV:';

export interface ResolveOptions {
  deferred?: boolean;
}

/**
 * Walk a dot-separated path into a value.
 * Throws if any intermediate segment is missing or not an object.
 */
export function walkPath(
  value: unknown,
  path: string,
  refPrefix: string,
): unknown {
  const segments = path.split('.');
  let current = value;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (
      current === null ||
      current === undefined ||
      typeof current !== 'object'
    ) {
      const visited = segments.slice(0, i).join('.');
      throwError(
        `Path "${path}" not found in "${refPrefix}": "${segment}" does not exist${visited ? ` in "${visited}"` : ''}`,
      );
    }
    const obj = current as Record<string, unknown>;
    if (!(segment in obj)) {
      const visited = segments.slice(0, i).join('.');
      throwError(
        `Path "${path}" not found in "${refPrefix}": "${segment}" does not exist${visited ? ` in "${visited}"` : ''}`,
      );
    }
    current = obj[segment];
  }

  return current;
}

/**
 * Resolve all dynamic patterns in a value.
 *
 * Patterns:
 * - $def.name → Look up definitions[name], replace entire value with definition content
 * - $def.name.path → Look up definitions[name], then walk dot-separated path
 * - $var.name → Look up variables[name]
 * - $env.NAME or $env.NAME:default → Look up process.env[NAME]
 */
function resolvePatterns(
  value: unknown,
  variables: Flow.Variables,
  definitions: Flow.Definitions,
  options?: ResolveOptions,
  resolvedContracts?: Record<string, Flow.ContractEntry>,
): unknown {
  if (typeof value === 'string') {
    // Check if entire string is a $def reference with optional deep path
    const defMatch = value.match(
      /^\$def\.([a-zA-Z_][a-zA-Z0-9_]*)(?:\.(.+))?$/,
    );
    if (defMatch) {
      const defName = defMatch[1];
      const path = defMatch[2]; // e.g., "nested.deep" or undefined

      if (definitions[defName] === undefined) {
        throwError(`Definition "${defName}" not found`);
      }

      // Resolve the definition content recursively first
      let resolved = resolvePatterns(
        definitions[defName],
        variables,
        definitions,
        options,
        resolvedContracts,
      );

      // Walk deep path if present
      if (path) {
        resolved = walkPath(resolved, path, `$def.${defName}`);
      }

      return resolved;
    }

    // Check if entire string is a $contract reference with path
    const contractMatch = value.match(
      /^\$contract\.([a-zA-Z_][a-zA-Z0-9_]*)(?:\.(.+))?$/,
    );
    if (contractMatch && resolvedContracts) {
      const contractName = contractMatch[1];
      const path = contractMatch[2];

      if (!(contractName in resolvedContracts)) {
        throwError(`Contract "${contractName}" not found`);
      }

      let resolved: unknown = resolvedContracts[contractName];

      if (path) {
        resolved = walkPath(resolved, path, `$contract.${contractName}`);
      }

      return resolved;
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
        if (options?.deferred) {
          return defaultValue !== undefined
            ? `${ENV_MARKER_PREFIX}${name}:${defaultValue}`
            : `${ENV_MARKER_PREFIX}${name}`;
        }
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
    return value.map((item) =>
      resolvePatterns(item, variables, definitions, options, resolvedContracts),
    );
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = resolvePatterns(
        val,
        variables,
        definitions,
        options,
        resolvedContracts,
      );
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
 * Get resolved flow settings for a named flow.
 *
 * @param config - The complete Flow.Config configuration
 * @param flowName - Flow name (auto-selected if only one exists)
 * @returns Resolved Settings with $var, $env, and $def patterns resolved
 * @throws Error if flow selection is required but not specified, or flow not found
 *
 * @example
 * ```typescript
 * import { getFlowSettings } from '@walkeros/core';
 *
 * const config = JSON.parse(fs.readFileSync('walkeros.config.json', 'utf8'));
 *
 * // Auto-select if only one flow
 * const settings = getFlowSettings(config);
 *
 * // Or specify flow
 * const prodSettings = getFlowSettings(config, 'production');
 * ```
 */
export function getFlowSettings(
  config: Flow.Config,
  flowName?: string,
  options?: ResolveOptions,
): Flow.Settings {
  const flowNames = Object.keys(config.flows);

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
  const settings = config.flows[flowName];
  if (!settings) {
    throwError(
      `Flow "${flowName}" not found. Available: ${flowNames.join(', ')}`,
    );
  }

  // Deep clone to avoid mutations
  const result = JSON.parse(JSON.stringify(settings)) as Flow.Settings;

  // Pre-process contracts: resolve $def inside contracts, then extends + wildcards
  let resolvedContracts: Record<string, Flow.ContractEntry> | undefined;
  if (config.contract) {
    // Two-pass: resolve $def/$var/$env inside contract first
    const vars = mergeVariables(config.variables, settings.variables);
    const defs = mergeDefinitions(config.definitions, settings.definitions);
    const resolvedContractInput = resolvePatterns(
      config.contract,
      vars,
      defs,
      options,
    ) as Flow.Contract;

    resolvedContracts = resolveContracts(resolvedContractInput);
  }

  // Process sources with variable and definition cascade
  if (result.sources) {
    for (const [name, source] of Object.entries(result.sources)) {
      const vars = mergeVariables(
        config.variables,
        settings.variables,
        source.variables,
      );
      const defs = mergeDefinitions(
        config.definitions,
        settings.definitions,
        source.definitions,
      );

      const processedConfig = resolvePatterns(
        source.config,
        vars,
        defs,
        options,
        resolvedContracts,
      );

      const processedEnv = resolvePatterns(
        source.env,
        vars,
        defs,
        options,
        resolvedContracts,
      );

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
        env: processedEnv,
        primary: source.primary,
        variables: source.variables,
        definitions: source.definitions,
        next: source.next,
        cache: source.cache,
        code: finalCode,
      } as Flow.SourceReference;
    }
  }

  // Process destinations with variable and definition cascade
  if (result.destinations) {
    for (const [name, dest] of Object.entries(result.destinations)) {
      const vars = mergeVariables(
        config.variables,
        settings.variables,
        dest.variables,
      );
      const defs = mergeDefinitions(
        config.definitions,
        settings.definitions,
        dest.definitions,
      );

      const processedConfig = resolvePatterns(
        dest.config,
        vars,
        defs,
        options,
        resolvedContracts,
      );

      const processedEnv = resolvePatterns(
        dest.env,
        vars,
        defs,
        options,
        resolvedContracts,
      );

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
        env: processedEnv,
        variables: dest.variables,
        definitions: dest.definitions,
        before: dest.before,
        cache: dest.cache,
        code: finalCode,
      } as Flow.DestinationReference;
    }
  }

  // Process stores with variable and definition cascade
  if (result.stores) {
    for (const [name, store] of Object.entries(result.stores)) {
      const vars = mergeVariables(
        config.variables,
        settings.variables,
        store.variables,
      );
      const defs = mergeDefinitions(
        config.definitions,
        settings.definitions,
        store.definitions,
      );

      const processedConfig = resolvePatterns(
        store.config,
        vars,
        defs,
        options,
        resolvedContracts,
      );

      const processedEnv = resolvePatterns(
        store.env,
        vars,
        defs,
        options,
        resolvedContracts,
      );

      const resolvedCode = resolveCodeFromPackage(
        store.package,
        store.code,
        result.packages,
      );

      const validCode =
        typeof store.code === 'string' || typeof store.code === 'object'
          ? store.code
          : undefined;
      const finalCode = resolvedCode || validCode;
      result.stores[name] = {
        package: store.package,
        config: processedConfig,
        env: processedEnv,
        variables: store.variables,
        definitions: store.definitions,
        code: finalCode,
      } as Flow.StoreReference;
    }
  }

  // Process transformers with variable and definition cascade
  if (result.transformers) {
    for (const [name, transformer] of Object.entries(result.transformers)) {
      const vars = mergeVariables(
        config.variables,
        settings.variables,
        transformer.variables,
      );
      const defs = mergeDefinitions(
        config.definitions,
        settings.definitions,
        transformer.definitions,
      );

      const processedConfig = resolvePatterns(
        transformer.config,
        vars,
        defs,
        options,
        resolvedContracts,
      );

      const processedEnv = resolvePatterns(
        transformer.env,
        vars,
        defs,
        options,
        resolvedContracts,
      );

      const resolvedCode = resolveCodeFromPackage(
        transformer.package,
        transformer.code,
        result.packages,
      );

      const validCode =
        typeof transformer.code === 'string' ||
        typeof transformer.code === 'object'
          ? transformer.code
          : undefined;
      const finalCode = resolvedCode || validCode;
      result.transformers[name] = {
        package: transformer.package,
        config: processedConfig,
        env: processedEnv,
        variables: transformer.variables,
        definitions: transformer.definitions,
        before: transformer.before,
        next: transformer.next,
        cache: transformer.cache,
        code: finalCode,
      } as Flow.TransformerReference;
    }
  }

  // Process collector config
  if (result.collector) {
    const vars = mergeVariables(config.variables, settings.variables);
    const defs = mergeDefinitions(config.definitions, settings.definitions);

    const processedCollector = resolvePatterns(
      result.collector,
      vars,
      defs,
      options,
      resolvedContracts,
    );
    result.collector = processedCollector as typeof result.collector;
  }

  return result;
}

/**
 * Get platform from settings (web or server).
 *
 * @param settings - Flow settings
 * @returns "web" or "server"
 * @throws Error if neither web nor server is present
 *
 * @example
 * ```typescript
 * import { getPlatform } from '@walkeros/core';
 *
 * const platform = getPlatform(settings);
 * // Returns "web" or "server"
 * ```
 */
export function getPlatform(settings: Flow.Settings): 'web' | 'server' {
  if (settings.web !== undefined) return 'web';
  if (settings.server !== undefined) return 'server';
  throwError('Settings must have web or server key');
}
