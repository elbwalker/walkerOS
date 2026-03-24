import type { Collector, Elb, Source, WalkerOS } from '@walkeros/core';
import type { RespondOptions } from '@walkeros/core';
import {
  getMappingValue,
  tryCatchAsync,
  compileNext,
  resolveNext,
  isRouteArray,
  compileCache,
  checkCache,
  storeCache,
  applyUpdate,
  buildCacheContext,
} from '@walkeros/core';
import { walkChain, extractTransformerNextMap } from './transformer';
import { getCacheStore } from './cache';

/**
 * Initialize a single source. Extracted from the initSources loop body
 * so it can be reused by the pending-source activator.
 */
export async function initSource(
  collector: Collector.Instance,
  sourceId: string,
  sourceDefinition: Source.InitSource,
): Promise<Source.Instance | undefined> {
  const {
    code,
    config = {},
    env = {},
    primary,
    next,
    cache,
  } = sourceDefinition;

  // Track current ingest metadata (set per-request by setIngest)
  let currentIngest: unknown = undefined;
  // Track current respond function (set per-request by setRespond)
  let currentRespond: import('@walkeros/core').RespondFn | undefined =
    undefined;

  // Compile source cache config (if configured)
  const compiledSourceCache = cache ? compileCache(cache) : undefined;

  // Resolve transformer chain for this source
  const compiledNext = compileNext(next);
  const isConditional = Array.isArray(next) && isRouteArray(next);
  // For static next, pre-walk at init (optimization)
  const staticPreChain =
    !isConditional && compiledNext
      ? walkChain(
          resolveNext(compiledNext)!,
          extractTransformerNextMap(collector.transformers),
        )
      : undefined;

  // Create wrapped push that auto-applies source mapping config, preChain, and ingest
  const wrappedPush: Collector.PushFn = async (
    event: WalkerOS.DeepPartialEvent,
    options: Collector.PushOptions = {},
  ) => {
    // Source cache check (always full — respond and skip pipeline on HIT)
    if (compiledSourceCache) {
      const cacheStore = getCacheStore(compiledSourceCache, collector);
      if (cacheStore) {
        const cacheContext = buildCacheContext(currentIngest);
        const cacheResult = checkCache(
          compiledSourceCache,
          cacheStore,
          cacheContext,
          `s:${sourceId}`,
        );

        if (cacheResult) {
          if (cacheResult.status === 'HIT' && cacheResult.value !== undefined) {
            // HIT: respond with cached value, skip pipeline entirely
            let respondValue: unknown = cacheResult.value;
            if (cacheResult.rule.update) {
              respondValue = await applyUpdate(
                respondValue,
                cacheResult.rule.update as Record<string, unknown>,
                { ...cacheContext, cache: { status: 'HIT' } },
              );
            }
            currentRespond?.(respondValue as Record<string, unknown>);
            return { ok: true } as Elb.PushResult;
          }

          if (cacheResult.status === 'MISS' && currentRespond) {
            // MISS: wrap respond to intercept and cache the value.
            // Capture the unwrapped respond — never wrap an already-wrapped respond.
            const unwrappedRespond = currentRespond;
            currentRespond = (async (respondOptions?: Record<string, unknown>) => {
              // Store the respond args in cache
              storeCache(
                cacheStore,
                cacheResult.key,
                respondOptions,
                cacheResult.rule.ttl,
              );
              // Apply update rules before forwarding
              if (cacheResult.rule.update) {
                const updated = await applyUpdate(
                  respondOptions,
                  cacheResult.rule.update as Record<string, unknown>,
                  { ...cacheContext, cache: { status: 'MISS' } },
                );
                unwrappedRespond(updated as RespondOptions);
              } else {
                unwrappedRespond(respondOptions);
              }
            }) as import('@walkeros/core').RespondFn;
          }
        }
      }
    }

    // Resolve chain: static (pre-computed) or conditional (per-event)
    const preChain =
      staticPreChain ??
      (compiledNext
        ? walkChain(
            resolveNext(compiledNext, buildCacheContext(currentIngest)),
            extractTransformerNextMap(collector.transformers),
          )
        : []);

    return collector.push(event, {
      ...options,
      id: sourceId,
      ingest: currentIngest,
      respond: currentRespond,
      mapping: config,
      preChain,
    });
  };

  // Create initial logger scoped to sourceId (type will be added after init)
  const initialLogger = collector.logger.scope('source').scope(sourceId);

  const cleanEnv: Source.Env = {
    push: wrappedPush,
    command: collector.command,
    sources: collector.sources,
    elb: collector.sources.elb.push,
    logger: initialLogger,
    ...env,
  };

  /**
   * setIngest extracts metadata from raw request using config.ingest mapping.
   * Opt-in: returns early if no config.ingest is defined.
   */
  const setIngest = async (value: unknown): Promise<void> => {
    if (!config.ingest) {
      currentIngest = undefined;
      return;
    }

    currentIngest = await getMappingValue(value, config.ingest, {
      collector,
    });
  };

  const setRespond = (fn: import('@walkeros/core').RespondFn | undefined) => {
    currentRespond = fn;
  };

  const sourceContext: Source.Context = {
    collector,
    logger: initialLogger,
    id: sourceId,
    config,
    env: cleanEnv,
    setIngest,
    setRespond,
  };

  const sourceInstance = await tryCatchAsync(code)(sourceContext);
  if (!sourceInstance) return undefined;

  const sourceType = sourceInstance.type || 'unknown';
  const sourceLogger = collector.logger.scope(sourceType).scope(sourceId);
  cleanEnv.logger = sourceLogger;

  if (primary) {
    sourceInstance.config = { ...sourceInstance.config, primary };
  }

  return sourceInstance;
}

/**
 * Initialize sources. Sources with `require` are deferred to collector.pending.
 */
export async function initSources(
  collector: Collector.Instance,
  sources: Source.InitSources = {},
): Promise<Collector.Sources> {
  const result: Collector.Sources = {};

  for (const [sourceId, sourceDefinition] of Object.entries(sources)) {
    const { config = {} } = sourceDefinition;

    if (config.require && config.require.length > 0) {
      collector.pending.sources[sourceId] = sourceDefinition;
      continue;
    }

    const sourceInstance = await initSource(
      collector,
      sourceId,
      sourceDefinition,
    );
    if (sourceInstance) {
      result[sourceId] = sourceInstance;
    }
  }

  return result;
}
