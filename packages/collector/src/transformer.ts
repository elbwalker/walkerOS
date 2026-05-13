/**
 * @module transformer
 *
 * Transformer Chain Utilities
 * ==========================
 *
 * This module provides the unified implementation for transformer chains in walkerOS.
 * Chains are used at two points in the data flow:
 *
 * 1. Pre-collector chains (source.next):
 *    Source → [Transformer Chain] → Collector
 *    Events are processed before the collector sees them.
 *
 * 2. Post-collector chains (destination.before):
 *    Collector → [Transformer Chain] → Destination
 *    Events are processed before reaching specific destinations.
 *
 * Key Functions:
 * - extractTransformerNextMap(): Extracts next links from transformer instances
 * - extractChainProperty(): Unified extraction of chain properties from definitions
 * - walkChain(): Resolves chain IDs from starting point
 * - runTransformerChain(): Executes a chain of transformers on an event
 *
 * Chain Resolution:
 * - String start: Walk transformer.next links until chain ends
 * - Array start: Use array directly (explicit chain, ignores transformer.next)
 *
 * Chain Termination:
 * - Transformer returns false → chain stops, event is dropped
 * - Transformer throws error → chain stops, event is dropped
 * - Transformer returns void → continue with unchanged event
 * - Transformer returns event → continue with modified event
 */
import type {
  Cache,
  Collector,
  Transformer,
  WalkerOS,
  Ingest,
} from '@walkeros/core';
import {
  createIngest,
  isObject,
  tryCatchAsync,
  useHooks,
  compileNext,
  resolveNext,
  compileCache,
  checkCache,
  storeCache,
  buildCacheContext,
  validateTransformerEntry,
  processEventMapping,
} from '@walkeros/core';
import { getCacheStore } from './cache';

/**
 * Extracts transformer next configuration for chain walking.
 * Maps transformer instances to their config.next values.
 *
 * This is the single source of truth for extracting chain links.
 * Used by both source.ts (pre-collector chains) and destination.ts (post-collector chains).
 *
 * @param transformers - Map of transformer instances
 * @returns Map of transformer IDs to their next configuration
 */
export function extractTransformerNextMap(
  transformers: Transformer.Transformers,
): Record<string, { next?: string | string[] }> {
  const result: Record<string, { next?: string | string[] }> = {};
  for (const [id, transformer] of Object.entries(transformers)) {
    const compiled = compileNext(transformer.config?.next);
    if (compiled?.type === 'static' || compiled?.type === 'chain') {
      result[id] = { next: compiled.value };
    } else {
      // Conditional / gated routes resolve per-event in walkChain; no static link.
      result[id] = {};
    }
  }
  return result;
}

/**
 * Extracts chain property from definition and merges into config.
 * Provides unified handling for source.next, destination.before, and transformer.next.
 *
 * @param definition - Component definition with optional chain property
 * @param propertyName - Name of chain property ('next' or 'before')
 * @returns Object with merged config and extracted chain value
 */
export function extractChainProperty<
  T extends { config?: Record<string, unknown>; [key: string]: unknown },
>(
  definition: T,
  propertyName: 'next' | 'before',
): {
  config: Record<string, unknown>;
  chainValue: string | string[] | undefined;
} {
  const config = (definition.config || {}) as Record<string, unknown>;
  const chainValue = definition[propertyName] as string | string[] | undefined;

  if (chainValue !== undefined) {
    return {
      config: { ...config, [propertyName]: chainValue },
      chainValue,
    };
  }

  return { config, chainValue: undefined };
}

/**
 * Walks a transformer chain starting from a given transformer ID.
 * Returns ordered array of transformer IDs in the chain.
 *
 * Used for on-demand chain resolution:
 * - Called from destination.ts with destination.config.before
 * - Called from source.ts with source.config.next
 *
 * @param startId - First transformer in chain, or explicit array of transformer IDs
 * @param transformers - Available transformer configs with optional `next` field
 * @returns Ordered array of transformer IDs to execute
 *
 * @example
 * // Single transformer
 * walkChain('redact', { redact: {} }) // ['redact']
 *
 * @example
 * // Chain via next
 * walkChain('a', { a: { next: 'b' }, b: { next: 'c' }, c: {} }) // ['a', 'b', 'c']
 *
 * @example
 * // Explicit array
 * walkChain(['x', 'y'], {}) // ['x', 'y']
 */
export function walkChain(
  startId: string | string[] | undefined,
  transformers: Record<string, { next?: string | string[] }> = {},
): string[] {
  if (!startId) return [];

  // If array provided, use it directly (explicit chain)
  if (Array.isArray(startId)) {
    return startId;
  }

  // Walk the chain via transformer.next links
  const chain: string[] = [];
  const visited = new Set<string>();
  let current: string | undefined = startId;

  while (current && transformers[current]) {
    if (visited.has(current)) {
      // Circular reference detected - stop walking
      break;
    }
    visited.add(current);
    chain.push(current);

    const next: string | string[] | undefined = transformers[current].next;

    // If transformer has array next, append it and stop walking
    if (Array.isArray(next)) {
      chain.push(...next);
      break;
    }

    current = next;
  }

  return chain;
}

/**
 * Initializes transformer instances from configuration.
 * Does NOT call transformer.init() - that happens lazily before first push.
 *
 * @param collector - The collector instance
 * @param initTransformers - Transformer initialization configurations
 * @returns Initialized transformer instances
 */
export async function initTransformers(
  collector: Collector.Instance,
  initTransformers: Transformer.InitTransformers = {},
): Promise<Transformer.Transformers> {
  const result: Transformer.Transformers = {};

  for (const [transformerId, transformerDef] of Object.entries(
    initTransformers,
  )) {
    const { code, env = {} } = transformerDef;

    // Validate the entry via the shared predicate. A code-less entry must
    // declare at least one operative field (package, before, next, cache,
    // mapping). Unknown keys and code+package conflicts are also rejected.
    const validation = validateTransformerEntry(
      transformerDef as unknown as Record<string, unknown>,
    );
    if (!validation.ok) {
      collector.logger.warn(
        `Transformer ${transformerId} invalid (${validation.code}): ${validation.reason}. Skipping.`,
      );
      continue;
    }

    // Use unified chain property extractor for both before and next
    const { config: configWithBefore } = extractChainProperty(
      transformerDef,
      'before',
    );
    const { config: configWithChain } = extractChainProperty(
      { ...transformerDef, config: configWithBefore },
      'next',
    );

    // Merge definition-level env into config so it's available during push.
    // transformerPush reads transformer.config.env to build the push context.
    const configWithEnv =
      Object.keys(env).length > 0
        ? { ...configWithChain, env: env as Transformer.Env }
        : configWithChain;

    // Merge definition-level cache into config for runtime access
    const { cache } = transformerDef;
    const configWithCache = cache ? { ...configWithEnv, cache } : configWithEnv;

    // Build transformer context for init
    const transformerLogger = collector.logger
      .scope('transformer')
      .scope(transformerId);

    const context = {
      collector,
      logger: transformerLogger,
      id: transformerId,
      ingest: createIngest(transformerId),
      config: configWithCache,
      env: env as Transformer.Env,
    };

    // Synthesize a passthrough instance when `code` is absent.
    // This makes the entry a "pass" — a named, code-less hop. Two flavors:
    //   1. mapping-aware: when `mapping` is declared, the synthesized push
    //      runs `processEventMapping` and forwards the transformed event
    //      (or drops it when a rule has `ignore: true`).
    //   2. plain passthrough: when only `before` / `next` / `cache` are
    //      declared, the push returns the event unchanged.
    const codeFn =
      code ??
      ((ctx: Transformer.Context) => {
        const stepMapping = transformerDef.mapping;
        if (stepMapping) {
          // Warn once per init if vendor-payload fields are present at the
          // transformer position. Only event-mutating fields apply here.
          // Note: `MappingConfig` has no top-level `silent` field — that
          // lives on `Rule` only, so the config-level check is `data` only.
          const meaninglessFields: string[] = [];
          if (stepMapping.data !== undefined) meaninglessFields.push('data');
          // Walk rules for per-rule data/silent
          if (stepMapping.mapping) {
            for (const [entity, actions] of Object.entries(
              stepMapping.mapping,
            )) {
              if (typeof actions !== 'object' || actions === null) continue;
              for (const [action, rule] of Object.entries(
                actions as Record<string, unknown>,
              )) {
                if (typeof rule !== 'object' || rule === null) continue;
                const r = rule as Record<string, unknown>;
                if (r.data !== undefined)
                  meaninglessFields.push(`mapping[${entity}][${action}].data`);
                if (r.silent !== undefined)
                  meaninglessFields.push(
                    `mapping[${entity}][${action}].silent`,
                  );
              }
            }
          }
          if (meaninglessFields.length > 0) {
            ctx.collector.logger.warn(
              `Transformer ${transformerId}: \`${meaninglessFields.join(', ')}\` ignored at transformer position (only event-mutating fields apply).`,
            );
          }

          return {
            type: 'pass',
            config: ctx.config,
            push: async (event: WalkerOS.DeepPartialEvent) => {
              const r = await processEventMapping(
                event,
                stepMapping,
                ctx.collector,
              );
              if (r.ignore) return false;
              return { event: r.event };
            },
          };
        }
        return {
          type: 'pass',
          config: ctx.config,
          push: (event: WalkerOS.DeepPartialEvent) => ({ event }),
        };
      });

    // Initialize the transformer instance with context
    const instance = await codeFn(context);

    // Bug 2 fix: propagate def-level before/next to instance.config when
    // not already set by the code function. The recursive chain walker
    // reads instance.config.before; for synthesized pass-throughs and
    // well-behaved user code that returns a fresh config object, the
    // def-level value needs to land on instance.config explicitly.
    // User-supplied code that sets its own config.before is preserved.
    if (
      transformerDef.before !== undefined &&
      instance.config?.before === undefined
    ) {
      instance.config = {
        ...(instance.config ?? {}),
        before: transformerDef.before,
      };
    }
    if (
      transformerDef.next !== undefined &&
      instance.config?.next === undefined
    ) {
      instance.config = {
        ...(instance.config ?? {}),
        next: transformerDef.next,
      };
    }

    result[transformerId] = instance;
  }

  return result;
}

/**
 * Initializes a transformer if it hasn't been initialized yet.
 * Called lazily before first push.
 *
 * @param collector - The collector instance
 * @param transformer - The transformer to initialize
 * @param transformerId - The transformer ID
 * @returns Whether initialization succeeded
 */
export async function transformerInit(
  collector: Collector.Instance,
  transformer: Transformer.Instance,
  transformerId: string,
): Promise<boolean> {
  // Check if already initialized
  if (transformer.init && !transformer.config.init) {
    const transformerType = transformer.type || 'unknown';
    const transformerLogger = collector.logger.scope(
      `transformer:${transformerType}`,
    );

    const context: Transformer.Context = {
      collector,
      logger: transformerLogger,
      id: transformerId,
      ingest: createIngest(transformerId),
      config: transformer.config,
      env: mergeTransformerEnvironments(transformer.config.env),
    };

    transformerLogger.debug('init');

    const configResult = await useHooks(
      transformer.init,
      'TransformerInit',
      collector.hooks,
      collector.logger,
    )(context);

    // Check for initialization failure
    if (configResult === false) return false;

    // Update config if returned, preserving env from definition
    transformer.config = {
      ...(configResult || transformer.config),
      env:
        ((configResult as Record<string, unknown>)?.env as Transformer.Env) ||
        transformer.config.env,
      init: true,
    };

    transformerLogger.debug('init done');
  }

  return true;
}

/**
 * Pushes an event through a single transformer.
 *
 * @param collector - The collector instance
 * @param transformer - The transformer to push to
 * @param transformerId - The transformer ID
 * @param event - The event to process
 * @param ingest - Mutable ingest context flowing through the pipeline
 * @returns The processed event, void for passthrough, or false to stop chain
 */
export async function transformerPush(
  collector: Collector.Instance,
  transformer: Transformer.Instance,
  transformerId: string,
  event: WalkerOS.DeepPartialEvent,
  ingest?: Ingest,
  respond?: import('@walkeros/core').RespondFn,
): Promise<Transformer.Result | Transformer.Result[] | false | void> {
  const transformerType = transformer.type || 'unknown';
  const transformerLogger = collector.logger.scope(
    `transformer:${transformerType}`,
  );

  const context: Transformer.Context = {
    collector,
    logger: transformerLogger,
    id: transformerId,
    ingest: ingest!, // Mutable shared context
    config: transformer.config,
    env: {
      ...mergeTransformerEnvironments(transformer.config.env),
      ...(respond ? { respond } : {}),
    },
  };

  transformerLogger.debug('push', { event: (event as { name?: string }).name });

  const result = await useHooks(
    transformer.push,
    'TransformerPush',
    collector.hooks,
    collector.logger,
  )(event, context);

  transformerLogger.debug('push done');

  return result;
}

/**
 * Resolve a `RouteSpec` (string, string[], or Route[]) to the static form
 * the downstream walkChain consumer understands. Used at every site inside
 * `runTransformerChain` that accepts a route spec from config or transformer
 * result (transformer.config.before, fork result.next, unified result.next).
 *
 * Returns `undefined` when the spec is absent, or when a Route[] evaluated
 * against the given context produced no match. Callers treat undefined as
 * "no static target" (either skip the chain or fall through to passthrough,
 * depending on the call site).
 */
function resolveRouteSpec(
  spec: Transformer.RouteSpec | undefined,
  ctx: Record<string, unknown>,
): string | string[] | undefined {
  if (!spec) return undefined;
  return resolveNext(compileNext(spec), ctx) ?? undefined;
}

/**
 * Runs an event through a chain of transformers.
 *
 * @param collector - The collector instance with transformers
 * @param transformers - Map of transformer instances
 * @param chain - Ordered array of transformer IDs to execute
 * @param event - The event to process
 * @param ingest - Mutable ingest context flowing through the pipeline
 * @returns The processed event or null if chain was stopped
 */
export async function runTransformerChain(
  collector: Collector.Instance,
  transformers: Transformer.Transformers,
  chain: string[],
  event: WalkerOS.DeepPartialEvent,
  ingest?: Ingest,
  respond?: import('@walkeros/core').RespondFn,
  chainContext?: string,
): Promise<Transformer.ChainResult> {
  const MAX_PATH_LENGTH = 256;

  if (chainContext && ingest?._meta) {
    ingest._meta.chainPath = chainContext;
  }

  let processedEvent = event;
  let currentRespond = respond;

  for (const transformerName of chain) {
    const transformer = transformers[transformerName];
    if (!transformer) {
      collector.logger.warn(`Transformer not found: ${transformerName}`);
      continue;
    }

    // Safety valve: prevent unbounded path growth
    if (ingest && ingest._meta && ingest._meta.path.length > MAX_PATH_LENGTH) {
      collector.logger.error(`Max path length exceeded at ${transformerName}`);
      return { event: null, respond: currentRespond };
    }

    // Track step in _meta (runtime-managed)
    if (ingest && ingest._meta) {
      ingest._meta.hops++;
      ingest._meta.path.push(transformerName);
    }

    // Initialize transformer if needed
    const isInitialized = await tryCatchAsync(transformerInit)(
      collector,
      transformer,
      transformerName,
    );

    if (!isInitialized) {
      collector.logger.error(`Transformer init failed: ${transformerName}`);
      return { event: null, respond: currentRespond }; // Stop chain on init failure
    }

    // Path-specific mock check (takes precedence)
    if (
      chainContext &&
      transformer.config?.chainMocks?.[chainContext] !== undefined
    ) {
      const chainMock = transformer.config.chainMocks[chainContext];
      collector.logger
        .scope(`transformer:${transformer.type || 'unknown'}`)
        .debug('chainMock', { chain: chainContext });
      processedEvent = chainMock as WalkerOS.DeepPartialEvent;
      continue;
    }

    // Global mock check
    if (transformer.config?.mock !== undefined) {
      collector.logger
        .scope(`transformer:${transformer.type || 'unknown'}`)
        .debug('mock');
      processedEvent = transformer.config.mock as WalkerOS.DeepPartialEvent;
      continue;
    }

    // Disabled check
    if (transformer.config?.disabled) {
      continue;
    }

    // Compile transformer cache once (reused for HIT check and MISS store).
    // Transformer caches operate on events (step-level HIT/MISS keyed by event
    // fields), so the rule shape is always EventCacheRule, not StoreCacheRule.
    const tCacheConfig = transformer.config?.cache as
      | Cache.Cache<Cache.EventCacheRule>
      | undefined;
    const compiledTCache = tCacheConfig
      ? compileCache(tCacheConfig)
      : undefined;
    const tCacheStore = compiledTCache
      ? getCacheStore(compiledTCache, collector)
      : undefined;

    // Check transformer cache (step-level: skip push, continue chain)
    let cacheMiss: { key: string; ttl: number } | undefined;
    if (compiledTCache && tCacheStore) {
      const cacheContext = buildCacheContext(ingest, processedEvent);
      const cacheResult = checkCache(compiledTCache, tCacheStore, cacheContext);

      if (cacheResult?.status === 'HIT' && cacheResult.value) {
        processedEvent = cacheResult.value as WalkerOS.DeepPartialEvent;
        if (compiledTCache.stop)
          // stop=true → stop chain AND halt pipeline at this position.
          // Caller branches on `stopped` to skip downstream stages
          // (collector.push, destinations); see push.ts and source.ts.
          return {
            event: processedEvent,
            respond: currentRespond,
            stopped: true,
          };
        continue; // stop=false → next transformer
      }

      if (cacheResult?.status === 'MISS') {
        cacheMiss = { key: cacheResult.key, ttl: cacheResult.rule.ttl };
      }
    }

    // Run transformer.before chain if configured
    const transformerBefore = transformer.config.before;
    if (transformerBefore) {
      const beforeStartId = resolveRouteSpec(
        transformerBefore,
        buildCacheContext(ingest, processedEvent),
      );

      const beforeChainIds = walkChain(
        beforeStartId,
        extractTransformerNextMap(transformers),
      );

      if (beforeChainIds.length > 0) {
        const beforeResult = await runTransformerChain(
          collector,
          transformers,
          beforeChainIds,
          processedEvent,
          ingest,
          currentRespond,
          chainContext,
        );
        if (beforeResult.event === null)
          return {
            event: null,
            respond: beforeResult.respond ?? currentRespond,
          }; // Before chain stopped
        // Propagate pipeline-halt from a nested `cache.stop: true` HIT in
        // the before chain. The outer caller (push.ts / source.ts) drops
        // the event before destinations see it.
        if (beforeResult.stopped) {
          return {
            event: Array.isArray(beforeResult.event)
              ? beforeResult.event[0]
              : beforeResult.event,
            respond: beforeResult.respond ?? currentRespond,
            stopped: true,
          };
        }
        if (beforeResult.respond) currentRespond = beforeResult.respond;
        // Before chains use first result if fan-out occurred
        processedEvent = Array.isArray(beforeResult.event)
          ? beforeResult.event[0]
          : beforeResult.event;
      }
    }

    // Run the transformer
    const result = await tryCatchAsync(transformerPush, (err) => {
      collector.logger
        .scope(`transformer:${transformer.type || 'unknown'}`)
        .error('Push failed', { error: err });
      return false as const; // Stop chain on error
    })(
      collector,
      transformer,
      transformerName,
      processedEvent,
      ingest,
      currentRespond,
    );

    // Handle result
    if (result === false) {
      // Transformer explicitly stopped the chain
      return { event: null, respond: currentRespond };
    }

    // Handle Result array (fan-out) — MUST be before typeof === 'object'
    if (Array.isArray(result)) {
      const remainingChain = chain.slice(chain.indexOf(transformerName) + 1);

      const forkResults = await Promise.all(
        result.map(async (forkResult) => {
          const forkEvent = forkResult.event || processedEvent;
          // Clone ingest per fork to prevent cross-fork contamination
          const forkIngest: Ingest = ingest
            ? {
                ...ingest,
                _meta: { ...ingest._meta, path: [...ingest._meta.path] },
              }
            : createIngest('unknown');

          if (forkResult.next) {
            // Fork has explicit routing
            const resolvedNext = resolveRouteSpec(
              forkResult.next,
              buildCacheContext(forkIngest, forkEvent),
            );
            if (resolvedNext) {
              const branchedChain = walkChain(
                resolvedNext,
                extractTransformerNextMap(transformers),
              );
              if (branchedChain.length > 0) {
                return runTransformerChain(
                  collector,
                  transformers,
                  branchedChain,
                  forkEvent,
                  forkIngest,
                  currentRespond,
                  chainContext,
                );
              }
            }
            return { event: forkEvent, respond: currentRespond };
          }

          // Fork continues through remaining chain
          if (remainingChain.length > 0) {
            return runTransformerChain(
              collector,
              transformers,
              remainingChain,
              forkEvent,
              forkIngest,
              currentRespond,
              chainContext,
            );
          }
          return { event: forkEvent, respond: currentRespond };
        }),
      );

      // Collect events from ChainResult objects and track last respond
      let lastForkRespond = currentRespond;
      const flatEvents: WalkerOS.DeepPartialEvent[] = [];
      for (const fr of forkResults.flat()) {
        if (fr === null) continue;
        if (fr && typeof fr === 'object' && 'event' in fr) {
          const cr = fr as Transformer.ChainResult;
          if (cr.respond) lastForkRespond = cr.respond;
          if (cr.event === null) continue;
          if (Array.isArray(cr.event)) flatEvents.push(...cr.event);
          else flatEvents.push(cr.event);
        } else {
          flatEvents.push(fr as WalkerOS.DeepPartialEvent);
        }
      }
      if (flatEvents.length === 0)
        return { event: null, respond: lastForkRespond };
      if (flatEvents.length === 1)
        return { event: flatEvents[0], respond: lastForkRespond };
      return { event: flatEvents, respond: lastForkRespond };
    }

    if (result && typeof result === 'object') {
      // Unified TransformerResult handling
      const { event: resultEvent, respond: resultRespond, next } = result;

      // Update respond if transformer provided a wrapper
      if (resultRespond) {
        currentRespond = resultRespond;
      }

      // Handle chain branching
      if (next) {
        const resolvedNext = resolveRouteSpec(
          next,
          buildCacheContext(ingest, processedEvent),
        );
        if (!resolvedNext) {
          // No route matched → passthrough (continue chain)
          if (resultEvent) processedEvent = resultEvent;
          continue;
        }

        const branchedChain = walkChain(
          resolvedNext,
          extractTransformerNextMap(transformers),
        );

        if (branchedChain.length > 0) {
          return runTransformerChain(
            collector,
            transformers,
            branchedChain,
            resultEvent || processedEvent,
            ingest,
            currentRespond,
            chainContext,
          );
        }

        // Branch target not found — drop event (fail-safe).
        collector.logger.warn(
          `Branch target not found: ${JSON.stringify(next)}`,
        );
        return { event: null, respond: currentRespond };
      }

      // Update event if provided
      if (resultEvent) {
        processedEvent = resultEvent;
      }
    }
    // If result is undefined (void), continue with current event unchanged

    // Cache MISS: store the processed event after push
    if (cacheMiss && tCacheStore) {
      storeCache(tCacheStore, cacheMiss.key, processedEvent, cacheMiss.ttl);
    }

    // If transformer didn't return { next } but has a conditional config.next,
    // resolve it per-request. Static (string / string[]) chains are already
    // wired statically via the next-map; case / gate / sequence variants need
    // this path (sequence may carry inner case/gate segments).
    const compiledConfigNext = transformer.config.next
      ? compileNext(transformer.config.next)
      : undefined;
    const isConditionalConfigNext =
      compiledConfigNext?.type === 'case' ||
      compiledConfigNext?.type === 'gate' ||
      compiledConfigNext?.type === 'sequence';
    if (
      (!result || (typeof result === 'object' && !result.next)) &&
      compiledConfigNext &&
      isConditionalConfigNext
    ) {
      const resolvedConfigNext = resolveNext(
        compiledConfigNext,
        buildCacheContext(ingest, processedEvent),
      );
      if (resolvedConfigNext) {
        const continuationChain = walkChain(
          resolvedConfigNext,
          extractTransformerNextMap(transformers),
        );
        if (continuationChain.length > 0) {
          return runTransformerChain(
            collector,
            transformers,
            continuationChain,
            processedEvent,
            ingest,
            currentRespond,
            chainContext,
          );
        }
      }
      // No match → chain ends here (passthrough to collector/destination)
      return { event: processedEvent, respond: currentRespond };
    }
  }

  return { event: processedEvent, respond: currentRespond };
}

/**
 * Merges transformer environments.
 */
function mergeTransformerEnvironments(
  configEnv?: Transformer.Env,
): Transformer.Env {
  if (!configEnv) return {};
  if (isObject(configEnv)) return configEnv;
  return {};
}
