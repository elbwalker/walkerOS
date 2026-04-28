/**
 * Flow Configuration Utilities
 *
 * Functions for resolving and processing Flow configurations.
 *
 * @packageDocumentation
 */

import type { Flow } from './types';
import { resolveContracts } from './contract';
import {
  REF_CONTRACT,
  REF_DEF,
  REF_ENV,
  REF_FLOW,
  REF_VAR,
} from './references';
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
  /**
   * When false, unresolved `$flow.X.Y` refs (unknown flow, missing key,
   * empty value) trigger {@link onWarning} and the original `$flow…` string
   * is left in place. Cycles always throw regardless of this flag.
   * Default: true (strict — throws as today).
   */
  strictFlowRefs?: boolean;
  /** Called for each unresolved $flow ref when {@link strictFlowRefs} is false. */
  onWarning?: (message: string) => void;
}

/** Format an actionable hint when `$flow.X.Y` cannot be resolved. */
function formatUnresolvedFlowMessage(
  flowName: string,
  path: string | undefined,
  reason: 'unknown-flow' | 'missing-key',
): string {
  const ref = `$flow.${flowName}${path ? `.${path}` : ''}`;
  if (reason === 'unknown-flow') {
    return `${ref} cannot resolve: flow "${flowName}" does not exist in this config.`;
  }
  // missing-key (includes empty url / missing settings.X)
  const target = path
    ? `flows.${flowName}.config.${path}`
    : `flows.${flowName}.config`;
  return `${ref} is empty. Set ${target}, or run \`walkeros deploy ${flowName}\` first.`;
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
 * Resolver callback for `$flow.X.Y` references.
 *
 * Given a sibling flow name, returns its fully resolved `Flow.Config` block
 * (with `$env`/`$var`/`$def`/`$contract` already resolved) as `unknown` so
 * that {@link walkPath} can traverse it. Returns `undefined` if the flow
 * does not exist. Implementations are responsible for cycle detection across
 * recursive calls.
 */
export type FlowConfigResolver = (flowName: string) => unknown;

/**
 * Resolve all dynamic patterns in a value.
 *
 * Patterns:
 * - $def.name → Look up definitions[name], replace entire value with definition content
 * - $def.name.path → Look up definitions[name], then walk dot-separated path
 * - $var.name → Look up variables[name]
 * - $env.NAME or $env.NAME:default → Look up process.env[NAME]
 * - $contract.name(.path)? → Resolved contract value (when contracts available)
 * - $flow.name(.path)? → Sibling flow's resolved {@link Flow.Config} (when resolver available)
 *
 * Top-level object keys are preserved verbatim (only values are walked), so an
 * object input retains its declared shape after resolution. The overload below
 * lets callers pass a typed object (e.g. `Flow.Config`) and get the same type
 * back without an unsafe cast. Strings that are whole-pattern references may
 * resolve to arbitrary types — callers passing a typed object should not rely
 * on individual string fields being preserved as strings.
 */
function resolvePatterns<T extends object>(
  value: T,
  variables: Flow.Variables,
  definitions: Flow.Definitions,
  options?: ResolveOptions,
  resolvedContracts?: Record<string, Flow.ContractRule>,
  resolveFlow?: FlowConfigResolver,
): T;
function resolvePatterns(
  value: unknown,
  variables: Flow.Variables,
  definitions: Flow.Definitions,
  options?: ResolveOptions,
  resolvedContracts?: Record<string, Flow.ContractRule>,
  resolveFlow?: FlowConfigResolver,
): unknown;
function resolvePatterns(
  value: unknown,
  variables: Flow.Variables,
  definitions: Flow.Definitions,
  options?: ResolveOptions,
  resolvedContracts?: Record<string, Flow.ContractRule>,
  resolveFlow?: FlowConfigResolver,
): unknown {
  if (typeof value === 'string') {
    // Check if entire string is a $def reference with optional deep path
    const defMatch = value.match(REF_DEF);
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
        resolveFlow,
      );

      // Walk deep path if present
      if (path) {
        resolved = walkPath(resolved, path, `$def.${defName}`);
      }

      return resolved;
    }

    // Check if entire string is a $contract reference with path
    const contractMatch = value.match(REF_CONTRACT);
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

    // Check if entire string is a $flow reference with optional path
    const flowMatch = value.match(REF_FLOW);
    if (flowMatch) {
      const flowName = flowMatch[1];
      const path = flowMatch[2]; // 'url' or 'settings.region' or undefined
      const softMode = options?.strictFlowRefs === false;

      if (!resolveFlow) {
        throwError(
          `$flow.${flowName}${path ? `.${path}` : ''} cannot be resolved without a flow resolver`,
        );
      }

      // resolveFlow may throw on cycle — that always propagates (cycles are bugs).
      const targetConfig = resolveFlow(flowName);
      if (!targetConfig) {
        if (softMode) {
          options?.onWarning?.(
            formatUnresolvedFlowMessage(flowName, path, 'unknown-flow'),
          );
          return value;
        }
        throwError(`Flow "${flowName}" not found in $flow.${flowName}`);
      }

      let resolved: unknown = targetConfig;
      if (path) {
        if (softMode) {
          // Try to walk; if walk fails OR result is empty/undefined, soft-warn and keep original.
          try {
            resolved = walkPath(resolved, path, `$flow.${flowName}`);
          } catch {
            options?.onWarning?.(
              formatUnresolvedFlowMessage(flowName, path, 'missing-key'),
            );
            return value;
          }
          if (resolved === undefined || resolved === null || resolved === '') {
            options?.onWarning?.(
              formatUnresolvedFlowMessage(flowName, path, 'missing-key'),
            );
            return value;
          }
        } else {
          resolved = walkPath(resolved, path, `$flow.${flowName}`);
        }
      }

      return resolved;
    }

    // Replace $var.name patterns (inline substitution)
    let result = value.replace(REF_VAR, (match, name) => {
      if (variables[name] !== undefined) {
        return String(variables[name]);
      }
      throwError(`Variable "${name}" not found`);
    });

    // Replace $env.NAME or $env.NAME:default patterns
    result = result.replace(REF_ENV, (match, name, defaultValue) => {
      if (options?.deferred) {
        return defaultValue !== undefined
          ? `${ENV_MARKER_PREFIX}${name}:${defaultValue}`
          : `${ENV_MARKER_PREFIX}${name}`;
      }
      if (typeof process !== 'undefined' && process.env?.[name] !== undefined) {
        return process.env[name]!;
      }
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throwError(
        `Environment variable "${name}" not found and no default provided`,
      );
    });

    return result;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      resolvePatterns(
        item,
        variables,
        definitions,
        options,
        resolvedContracts,
        resolveFlow,
      ),
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
        resolveFlow,
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
  existingCode: string | Flow.Code | undefined,
  packages: Record<string, Flow.BundlePackage> | undefined,
): string | Flow.Code | undefined {
  // Preserve explicit code first (including InlineCode objects)
  if (existingCode) return existingCode;

  // Auto-generate code from package name if package exists
  if (!packageName || !packages) return undefined;

  const pkgConfig = packages[packageName];
  if (!pkgConfig) return undefined;

  return packageNameToVariable(packageName);
}

/**
 * Get resolved flow for a named flow.
 *
 * Resolution pass order:
 * 1. `$env` / `$var` resolve per-flow in isolation (no cross-flow context).
 * 2. `$flow.X.Y` resolves against pass-1 outputs of sibling flows (so `$env`/`$var`
 *    inside the referenced flow are already resolved when `$flow` reads it).
 * 3. `$def` / `$contract` resolve last (with `$flow` results available).
 *
 * In practice these passes are interleaved by the resolver: when `$flow.X.Y`
 * is encountered, the sibling flow X's `Flow.Config` block is recursively
 * resolved on demand (with all its own `$env`/`$var`/`$def`/`$contract`
 * references resolved first), then the deep path is walked. Cycles are
 * detected via a visiting set.
 *
 * @param config - The complete Flow.Json (root multi-flow config)
 * @param flowName - Flow name (auto-selected if only one exists)
 * @param options - Resolution options
 * @returns Resolved {@link Flow} with $var, $env, $def, $contract, and $flow patterns resolved
 * @throws Error if flow selection is required but not specified, or flow not found
 * @throws Error if a `$flow.X.Y` reference forms a cycle
 *
 * @example
 * ```typescript
 * import { getFlowSettings } from '@walkeros/core';
 *
 * const config = JSON.parse(fs.readFileSync('walkeros.config.json', 'utf8'));
 *
 * // Auto-select if only one flow
 * const flow = getFlowSettings(config);
 *
 * // Or specify flow
 * const prodFlow = getFlowSettings(config, 'production');
 * ```
 */
export function getFlowSettings(
  config: Flow.Json,
  flowName?: string,
  options?: ResolveOptions,
): Flow {
  // Per-call shared state for cross-flow resolution.
  const resolvedFlowConfigs = new Map<string, unknown>();
  const visiting = new Set<string>();
  const visitOrder: string[] = [];

  /**
   * Recursively resolve a sibling flow's `Flow.Config` block.
   * Used by the resolver when it encounters `$flow.X.Y`.
   * Throws on cycles. Returns undefined if the flow does not exist.
   */
  const resolveFlowConfig: FlowConfigResolver = (targetName): unknown => {
    if (resolvedFlowConfigs.has(targetName)) {
      return resolvedFlowConfigs.get(targetName);
    }

    const targetSettings = config.flows[targetName];
    if (!targetSettings) return undefined;

    if (visiting.has(targetName)) {
      const chain = [...visitOrder, targetName].join(' -> ');
      throwError(`Cyclic $flow reference: ${chain}`);
    }

    visiting.add(targetName);
    visitOrder.push(targetName);
    try {
      const vars = mergeVariables(config.variables, targetSettings.variables);
      const defs = mergeDefinitions(
        config.definitions,
        targetSettings.definitions,
      );
      // Resolve only the public config block: that is what $flow may read.
      const resolved = resolvePatterns(
        targetSettings.config ?? {},
        vars,
        defs,
        options,
        undefined, // contracts not consulted inside Flow.Config
        resolveFlowConfig,
      );
      resolvedFlowConfigs.set(targetName, resolved);
      return resolved;
    } finally {
      visiting.delete(targetName);
      visitOrder.pop();
    }
  };

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

  // Cycle guard for the top-level flow being resolved as well.
  // Without this, a cycle initiated from the entry flow (a → b → a) would
  // not be detected when control returned to "a".
  visiting.add(flowName);
  visitOrder.push(flowName);

  try {
    return resolveFlowSettings(config, settings, options, resolveFlowConfig);
  } finally {
    visiting.delete(flowName);
    visitOrder.pop();
  }
}

function resolveFlowSettings(
  config: Flow.Json,
  settings: Flow,
  options: ResolveOptions | undefined,
  resolveFlow: FlowConfigResolver,
): Flow {
  // Deep clone to avoid mutations
  const result = JSON.parse(JSON.stringify(settings)) as Flow;

  // Pre-process contracts: resolve $def inside contracts, then extends + wildcards
  let resolvedContracts: Record<string, Flow.ContractRule> | undefined;
  if (config.contract) {
    // Two-pass: resolve $def/$var/$env inside contract first
    const vars = mergeVariables(config.variables, settings.variables);
    const defs = mergeDefinitions(config.definitions, settings.definitions);
    const resolvedContractInput = resolvePatterns(
      config.contract,
      vars,
      defs,
      options,
      undefined,
      resolveFlow,
    ) as Flow.Contract;

    resolvedContracts = resolveContracts(resolvedContractInput);
  }

  // Process the flow's own config block so $flow/$env/$var refs inside
  // it (e.g. settings.url = '$flow.server.url') are resolved.
  if (result.config) {
    const vars = mergeVariables(config.variables, settings.variables);
    const defs = mergeDefinitions(config.definitions, settings.definitions);
    result.config = resolvePatterns(
      result.config,
      vars,
      defs,
      options,
      resolvedContracts,
      resolveFlow,
    );
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
        resolveFlow,
      );

      const processedEnv = resolvePatterns(
        source.env,
        vars,
        defs,
        options,
        resolvedContracts,
        resolveFlow,
      );

      // Resolve code from package reference
      const resolvedCode = resolveCodeFromPackage(
        source.package,
        source.code,
        result.config?.bundle?.packages,
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
        before: source.before,
        next: source.next,
        cache: source.cache,
        code: finalCode,
      } as Flow.Source;
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
        resolveFlow,
      );

      const processedEnv = resolvePatterns(
        dest.env,
        vars,
        defs,
        options,
        resolvedContracts,
        resolveFlow,
      );

      // Resolve code from package reference
      const resolvedCode = resolveCodeFromPackage(
        dest.package,
        dest.code,
        result.config?.bundle?.packages,
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
        next: dest.next,
        cache: dest.cache,
        code: finalCode,
      } as Flow.Destination;
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
        resolveFlow,
      );

      const processedEnv = resolvePatterns(
        store.env,
        vars,
        defs,
        options,
        resolvedContracts,
        resolveFlow,
      );

      const resolvedCode = resolveCodeFromPackage(
        store.package,
        store.code,
        result.config?.bundle?.packages,
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
      } as Flow.Store;
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
        resolveFlow,
      );

      const processedEnv = resolvePatterns(
        transformer.env,
        vars,
        defs,
        options,
        resolvedContracts,
        resolveFlow,
      );

      const resolvedCode = resolveCodeFromPackage(
        transformer.package,
        transformer.code,
        result.config?.bundle?.packages,
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
      } as Flow.Transformer;
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
      resolveFlow,
    );
    result.collector = processedCollector as typeof result.collector;
  }

  return result;
}

/**
 * Get the platform of a flow ('web' or 'server').
 *
 * Reads from `flow.config.platform`.
 *
 * @param flow - Resolved flow (output of {@link getFlowSettings})
 * @returns "web" or "server"
 * @throws Error if `config.platform` is missing
 *
 * @example
 * ```typescript
 * import { getPlatform } from '@walkeros/core';
 *
 * const platform = getPlatform(flow);
 * // Returns "web" or "server"
 * ```
 */
export function getPlatform(flow: Flow): 'web' | 'server' {
  const platform = flow.config?.platform;
  if (platform === 'web' || platform === 'server') return platform;
  throwError('Flow must have config.platform set to "web" or "server"');
}
