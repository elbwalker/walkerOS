/**
 * Flow Configuration Utilities
 *
 * Functions for resolving and processing Flow configurations.
 *
 * @packageDocumentation
 */

import type { Flow } from './types';
import {
  resolveContract,
  getContractEvents,
  getContractSections,
  mergeContractSchemas,
} from './contract';
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
  options?: ResolveOptions,
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
      return resolvePatterns(
        definitions[defName],
        variables,
        definitions,
        options,
      );
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
      resolvePatterns(item, variables, definitions, options),
    );
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = resolvePatterns(val, variables, definitions, options);
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
      );

      const processedEnv = resolvePatterns(source.env, vars, defs, options);

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

      const processedConfig = resolvePatterns(dest.config, vars, defs, options);

      const processedEnv = resolvePatterns(dest.env, vars, defs, options);

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
      );

      const processedEnv = resolvePatterns(store.env, vars, defs, options);

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
      );

      const processedEnv = resolvePatterns(
        transformer.env,
        vars,
        defs,
        options,
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
        next: transformer.next,
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
    );
    result.collector = processedCollector as typeof result.collector;
  }

  // Resolve $contract references
  const configContract = config.contract;
  const settingsContract = settings.contract;

  if (configContract || settingsContract) {
    // Collect all entity-action pairs from both contracts
    const entityActions = collectEntityActions(
      configContract,
      settingsContract,
    );

    // Resolve each pair and build Mapping.Rules<ContractRule>
    const resolvedRules: Record<
      string,
      Record<string, { schema: Record<string, unknown> }>
    > = {};

    for (const [entity, action] of entityActions) {
      const resolved = resolveContract(
        configContract || ({} as Flow.Contract),
        entity,
        action,
        settingsContract,
      );

      if (Object.keys(resolved).length > 0) {
        if (!resolvedRules[entity]) resolvedRules[entity] = {};
        resolvedRules[entity][action] = {
          schema: stripAnnotations(resolved),
        };
      }
    }

    // Resolve section references ($globals, $context, $custom, $user, $consent)
    const setupSections = configContract
      ? getContractSections(configContract)
      : {};
    const configSections = settingsContract
      ? getContractSections(settingsContract)
      : {};

    const mergedSections: Record<string, Record<string, unknown>> = {};
    for (const key of [
      'globals',
      'context',
      'custom',
      'user',
      'consent',
    ] as const) {
      const s = setupSections[key];
      const c = configSections[key];
      if (s && c) {
        mergedSections[key] = mergeContractSchemas(s, c);
      } else if (s || c) {
        mergedSections[key] = (s || c)!;
      }
    }

    // Replace $contract and section references in transformer configs
    if (result.transformers) {
      for (const [, transformer] of Object.entries(result.transformers)) {
        replaceContractRef(transformer.config, resolvedRules);
        for (const [sectionKey, schema] of Object.entries(mergedSections)) {
          replaceSectionRef(
            transformer.config,
            `$${sectionKey}`,
            stripAnnotations(schema),
          );
        }
      }
    }

    // Inject $tagging into collector.tagging (if not already set)
    const tagging = configContract?.$tagging ?? settingsContract?.$tagging;
    if (typeof tagging === 'number') {
      const collector = (result.collector || {}) as Record<string, unknown>;
      if (collector.tagging === undefined) {
        collector.tagging = tagging;
      }
      result.collector = collector as typeof result.collector;
    }
  }

  return result;
}

/**
 * Collect unique entity-action pairs from contracts (excluding metadata keys).
 */
function collectEntityActions(
  ...contracts: (Flow.Contract | undefined)[]
): Array<[string, string]> {
  const pairs = new Set<string>();
  const allEntities = new Set<string>();
  const allActions = new Set<string>();

  for (const contract of contracts) {
    if (!contract) continue;
    const events = getContractEvents(contract);

    for (const entity of Object.keys(events)) {
      if (entity === '*') continue;
      allEntities.add(entity);
      const actions = events[entity];
      if (actions && typeof actions === 'object') {
        for (const action of Object.keys(actions as Record<string, unknown>)) {
          if (action !== '*') {
            allActions.add(action);
            pairs.add(`${entity}\0${action}`);
          }
        }
      }
    }
  }

  // Expand wildcards against all known entities/actions
  for (const entity of allEntities) {
    for (const action of allActions) {
      pairs.add(`${entity}\0${action}`);
    }
  }

  return [...pairs].map((p) => p.split('\0') as [string, string]);
}

/** Annotation keys to strip from AJV-compatible schemas */
const ANNOTATION_KEYS = new Set([
  'description',
  'examples',
  'title',
  '$comment',
]);

/**
 * Strip annotation-only keys from a resolved schema (deep).
 */
function stripAnnotations(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (ANNOTATION_KEYS.has(key)) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = stripAnnotations(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Replace "$contract" string references in transformer config with resolved rules.
 */
function replaceContractRef(config: unknown, resolved: unknown): void {
  if (!config || typeof config !== 'object') return;
  const obj = config as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (obj[key] === '$contract') {
      obj[key] = resolved;
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      replaceContractRef(obj[key], resolved);
    }
  }
}

/**
 * Replace "$<section>" string references in transformer config with resolved schema.
 */
function replaceSectionRef(
  config: unknown,
  ref: string,
  resolved: unknown,
): void {
  if (!config || typeof config !== 'object') return;
  const obj = config as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (obj[key] === ref) {
      obj[key] = resolved;
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      replaceSectionRef(obj[key], ref, resolved);
    }
  }
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
