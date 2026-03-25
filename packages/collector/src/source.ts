import type { Collector, Elb, Ingest, Source, WalkerOS } from '@walkeros/core';
import type { RespondOptions } from '@walkeros/core';
import {
  createIngest,
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
import {
  walkChain,
  extractTransformerNextMap,
  runTransformerChain,
} from './transformer';
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
    before,
    cache,
  } = sourceDefinition;

  // Track current ingest metadata (set per-request by setIngest)
  let currentIngest: Ingest = createIngest(sourceId);
  // Track current respond function (set per-request by setRespond)
  let currentRespond: import('@walkeros/core').RespondFn | undefined =
    undefined;

  // Compile source cache config (if configured)
  const compiledSourceCache = cache
    ? compileCache({ ...cache, full: cache.full ?? true })
    : undefined;

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

  // Resolve before chain for this source (consent-exempt, pre-source preprocessing)
  const compiledBefore = compileNext(before);
  const isBeforeConditional = Array.isArray(before) && isRouteArray(before);
  const staticBeforeChain =
    !isBeforeConditional && compiledBefore
      ? walkChain(
          resolveNext(compiledBefore)!,
          extractTransformerNextMap(collector.transformers),
        )
      : undefined;

  // Create wrapped push that auto-applies source mapping config, preChain, and ingest
  const wrappedPush: Collector.PushFn = async (
    rawEvent: WalkerOS.DeepPartialEvent,
    options: Collector.PushOptions = {},
  ) => {
    let event = rawEvent;

    // Resolve before chain (static or conditional)
    const beforeChain =
      staticBeforeChain ??
      (compiledBefore
        ? walkChain(
            resolveNext(compiledBefore, buildCacheContext(currentIngest))!,
            extractTransformerNextMap(collector.transformers),
          )
        : []);

    // Run source.before chain (consent-exempt, pre-source preprocessing)
    if (
      beforeChain.length > 0 &&
      collector.transformers &&
      Object.keys(collector.transformers).length > 0
    ) {
      const beforeResult = await runTransformerChain(
        collector,
        collector.transformers,
        beforeChain,
        event,
        currentIngest,
        currentRespond,
      );
      if (beforeResult === null) {
        return { ok: true } as Elb.PushResult;
      }
      // Before chains use first result if fan-out occurred
      event = Array.isArray(beforeResult) ? beforeResult[0] : beforeResult;
    }

    // Source cache check (full=true by default for sources)
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
            if (compiledSourceCache.full) {
              // full=true (default): respond with cached value, skip pipeline
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
            // full=false: cached value unused — HIT signals "seen before", pipeline continues
          }

          if (
            cacheResult.status === 'MISS' &&
            compiledSourceCache.full &&
            currentRespond
          ) {
            // full=true MISS: wrap respond to intercept and cache the value.
            // Respond synchronously first (wins first-call-wins race with source
            // fallback), then store cache. Update rules apply to cached value only
            // on HIT, applyUpdate runs before responding.
            const unwrappedRespond = currentRespond;
            currentRespond = ((respondOptions?: Record<string, unknown>) => {
              // Respond immediately (sync) to win the first-call-wins race
              unwrappedRespond(respondOptions);

              // Store the respond args in cache (async, fire-and-forget)
              storeCache(
                cacheStore,
                cacheResult.key,
                respondOptions,
                cacheResult.rule.ttl,
              );
            }) as import('@walkeros/core').RespondFn;
          }

          // full=false MISS: store sentinel so subsequent requests get a HIT
          if (cacheResult.status === 'MISS' && !compiledSourceCache.full) {
            storeCache(cacheStore, cacheResult.key, true, cacheResult.rule.ttl);
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
   * Always produces a typed Ingest with valid _meta.
   */
  const setIngest = async (value: unknown): Promise<void> => {
    if (!config.ingest) {
      currentIngest = createIngest(sourceId);
      return;
    }

    const extracted = await getMappingValue(value, config.ingest, {
      collector,
    });

    // Merge extracted values into a fresh Ingest
    const fresh = createIngest(sourceId);
    currentIngest = {
      ...fresh,
      ...(extracted as Record<string, unknown>),
      _meta: fresh._meta, // Protect _meta from being overwritten by extracted data
    };
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
