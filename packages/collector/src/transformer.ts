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
import type { Collector, Transformer, WalkerOS, Ingest } from '@walkeros/core';
import {
  createIngest,
  isObject,
  tryCatchAsync,
  useHooks,
  compileNext,
  resolveNext,
  isRouteArray,
  compileCache,
  checkCache,
  storeCache,
  buildCacheContext,
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
    const next = transformer.config?.next;
    if (next && !isRouteArray(next)) {
      result[id] = { next: next as string | string[] };
    } else {
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

    // Initialize the transformer instance with context
    const instance = await code(context);

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

    // Compile transformer cache once (reused for HIT check and MISS store)
    const tCacheConfig = transformer.config?.cache;
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
      const cacheResult = checkCache(
        compiledTCache,
        tCacheStore,
        cacheContext,
        `t:${transformerName}`,
      );

      if (cacheResult?.status === 'HIT' && cacheResult.value) {
        processedEvent = cacheResult.value as WalkerOS.DeepPartialEvent;
        if (compiledTCache.full)
          return { event: processedEvent, respond: currentRespond }; // full=true → stop chain
        continue; // full=false → next transformer
      }

      if (cacheResult?.status === 'MISS') {
        cacheMiss = { key: cacheResult.key, ttl: cacheResult.rule.ttl };
      }
    }

    // Run transformer.before chain if configured
    const transformerBefore = transformer.config.before;
    if (transformerBefore) {
      const beforeStartId =
        typeof transformerBefore === 'string'
          ? transformerBefore
          : Array.isArray(transformerBefore) && !isRouteArray(transformerBefore)
            ? transformerBefore
            : resolveNext(
                compileNext(transformerBefore),
                buildCacheContext(ingest, processedEvent),
              ) || undefined;

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
            let resolvedNext: string | string[] | undefined =
              forkResult.next as string | string[];
            if (isRouteArray(forkResult.next)) {
              const compiled = compileNext(forkResult.next);
              resolvedNext = resolveNext(
                compiled,
                buildCacheContext(forkIngest, forkEvent),
              );
            }
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
        // Resolve NextRule[] if present
        let resolvedNext: string | string[] | undefined = next as
          | string
          | string[];
        if (isRouteArray(next)) {
          const compiled = compileNext(next);
          resolvedNext = resolveNext(
            compiled,
            buildCacheContext(ingest, processedEvent),
          );
          if (!resolvedNext) {
            // No route matched → passthrough (continue chain)
            if (resultEvent) processedEvent = resultEvent;
            continue;
          }
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

    // If transformer didn't return { next } but has NextRule[] config.next, resolve it
    if (
      (!result || (typeof result === 'object' && !result.next)) &&
      transformer.config.next &&
      isRouteArray(transformer.config.next)
    ) {
      const configNext = transformer.config.next;
      const compiledConfigNext = compileNext(configNext);
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
