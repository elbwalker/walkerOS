import type {
  Cache,
  Collector,
  Elb,
  Ingest,
  Source,
  WalkerOS,
} from '@walkeros/core';
import type { RespondFn, RespondOptions } from '@walkeros/core';
import {
  createIngest,
  getMappingValue,
  tryCatchAsync,
  getNextSteps,
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
  cloneIngest,
} from './transformer';

/**
 * A Route is "static" when it's a transformer-ID string or an array of
 * transformer-ID strings. Static routes can be resolved once at init and
 * walked synchronously; conditional shapes (RouteConfig, mixed arrays)
 * depend on per-event context and resolve via getNextSteps at dispatch.
 */
function isStaticRoute(
  route: import('@walkeros/core').Transformer.Route | undefined,
): route is string | string[] {
  if (typeof route === 'string') return true;
  if (
    Array.isArray(route) &&
    route.every((entry) => typeof entry === 'string')
  ) {
    return true;
  }
  return false;
}
import { getCacheStore } from './cache';

/**
 * Flush a source's queueOn buffer. Called when the source becomes "started"
 * (config.init === true AND config.require is empty/absent). Idempotent:
 * the buffer is cleared before iteration, so re-entry from within an `on`
 * handler does not re-fire the same items.
 */
export async function flushSourceQueueOn(
  collector: Collector.Instance,
  source: Source.Instance,
): Promise<void> {
  if (!source.on || !source.queueOn?.length) return;
  const queue = source.queueOn;
  source.queueOn = [];
  for (const { type, data } of queue) {
    await tryCatchAsync(source.on)(type, data);
  }
}

/**
 * A source is "started" — eligible to receive on() events directly — when
 * its init has run and any require gate is satisfied.
 */
export function isSourceStarted(source: Source.Instance): boolean {
  return Boolean(source.config.init) && !source.config.require?.length;
}

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
  let currentRespond: RespondFn | undefined = undefined;

  // Compile source cache config (if configured).
  // Source caches operate on events (request-scoped HIT/MISS keyed by event
  // fields), so the rule shape is always EventCacheRule, not StoreCacheRule.
  const sourceCacheConfig = cache as
    | Cache.Cache<Cache.EventCacheRule>
    | undefined;
  const compiledSourceCache = sourceCacheConfig
    ? compileCache({
        ...sourceCacheConfig,
        stop: sourceCacheConfig.stop ?? true,
      })
    : undefined;

  // Resolve transformer chain for this source.
  // Static (string / string[]) chains pre-walk at init (optimization).
  // Conditional shapes (case / gate) require per-request context — see wrappedPush.
  const staticPreChain = isStaticRoute(next)
    ? walkChain(next, extractTransformerNextMap(collector.transformers))
    : undefined;

  // Resolve before chain for this source (consent-exempt, pre-source preprocessing).
  const staticBeforeChain = isStaticRoute(before)
    ? walkChain(before, extractTransformerNextMap(collector.transformers))
    : undefined;

  // Create wrapped push that auto-applies source mapping config, preChain, and ingest
  const wrappedPush: Collector.PushFn = async (
    rawEvent: WalkerOS.DeepPartialEvent,
    options: Collector.PushOptions = {},
  ) => {
    let pendingRespond: Promise<void> | undefined;

    // Resolve before chain (static or conditional).
    // Single-id results walk static `.next` links; multi-id results are
    // explicit chains (fan-out from `many` is handled by the engine).
    const beforeChain =
      staticBeforeChain ??
      (before !== undefined
        ? (() => {
            const ids = getNextSteps(before, buildCacheContext(currentIngest));
            if (ids.length === 0) return [];
            const start = ids.length === 1 ? ids[0] : ids;
            return walkChain(
              start,
              extractTransformerNextMap(collector.transformers),
            );
          })()
        : []);

    // The before chain may fan out (return an array of events). The cache
    // check and destination push must run once per event so fan-out is
    // preserved end-to-end. Cache logic is request-scoped (keyed by
    // `currentIngest`), so it lives outside the loop. The actual pipeline
    // (preChain + collector.push) runs inside the loop, once per event.
    let events: WalkerOS.DeepPartialEvent[] = [rawEvent];

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
        rawEvent,
        currentIngest,
        currentRespond,
        `source.${sourceId}.before`,
      );
      if (beforeResult.event === null) {
        return { ok: true } as Elb.PushResult;
      }
      // Pipeline-halt signal from a `cache.stop: true` HIT inside the
      // source.before chain. Do NOT invoke collector.push — drop the event
      // before it enters the collector pipeline.
      if (beforeResult.stopped) {
        if (beforeResult.respond) currentRespond = beforeResult.respond;
        return { ok: true } as Elb.PushResult;
      }
      if (beforeResult.respond) currentRespond = beforeResult.respond;
      events = Array.isArray(beforeResult.event)
        ? beforeResult.event
        : [beforeResult.event];
    }

    // Source cache check (full=true by default for sources)
    if (compiledSourceCache) {
      const cacheStore = getCacheStore(compiledSourceCache, collector);
      if (cacheStore) {
        const cacheContext = buildCacheContext(currentIngest);
        const cacheResult = await checkCache(
          compiledSourceCache,
          cacheStore,
          cacheContext,
          // no per-step prefix — cache keys honor user-provided namespace only
        );

        if (cacheResult) {
          if (cacheResult.status === 'HIT' && cacheResult.value !== undefined) {
            if (compiledSourceCache.stop) {
              // stop=true (default): respond with cached value, skip pipeline
              let respondValue: unknown = cacheResult.value;
              if (cacheResult.rule.update) {
                respondValue = await applyUpdate(
                  respondValue,
                  cacheResult.rule.update as Record<string, unknown>,
                  { ...cacheContext, cache: { status: 'HIT' } },
                  collector,
                );
              }
              currentRespond?.(respondValue as Record<string, unknown>);
              return { ok: true } as Elb.PushResult;
            }
            // stop=false: cached value unused — HIT signals "seen before", pipeline continues
          }

          if (
            cacheResult.status === 'MISS' &&
            compiledSourceCache.stop &&
            currentRespond
          ) {
            // stop=true MISS: wrap respond to intercept and cache the value.
            // Store original in cache, then apply update rules with MISS
            // status before responding (mirrors HIT path which applies
            // with HIT status).
            //
            // When `update` is configured the update step is async, so
            // the wrapper captures its promise in `pendingRespond`.
            // `wrappedPush` awaits that promise before returning, so
            // any source fallback that runs after `await env.push(...)`
            // (e.g. the express source's transparent-GIF default) sees
            // `createRespond`'s first-call-wins flag already set and
            // correctly no-ops. Without this, the fallback would win
            // the race and the real response would be lost.
            const unwrappedRespond = currentRespond;
            const missUpdate = cacheResult.rule.update;
            const missContext = { ...cacheContext, cache: { status: 'MISS' } };
            const missKey = cacheResult.key;
            const missTtl = cacheResult.rule.ttl;

            const missRespond: RespondFn = (respondOptions) => {
              storeCache(cacheStore, missKey, respondOptions, missTtl);

              if (!missUpdate) {
                unwrappedRespond(respondOptions);
                return;
              }

              pendingRespond = (async () => {
                const updated = await applyUpdate(
                  respondOptions,
                  missUpdate as Record<string, unknown>,
                  missContext,
                  collector,
                );
                unwrappedRespond(updated as RespondOptions);
              })();
            };

            currentRespond = missRespond;
          }

          // stop=false MISS: store sentinel so subsequent requests get a HIT
          if (cacheResult.status === 'MISS' && !compiledSourceCache.stop) {
            storeCache(cacheStore, cacheResult.key, true, cacheResult.rule.ttl);
          }
        }
      }
    }

    // Resolve chain: static (pre-computed) or conditional (per-event).
    // Three dispatch shapes from `getNextSteps`:
    // - []          → no route matched; passthrough to collector with no
    //                 pre-chain.
    // - ['x']       → walk static `.next` links from x and run as a single
    //                 sequential subchain inside `collector.push`.
    // - ['a','b',…] → `many` fan-out. Each id is an INDEPENDENT terminal
    //                 subchain dispatched via its own `collector.push` call
    //                 with a per-branch cloned ingest and `respond` cleared
    //                 (no-respond-across-many doctrine, Task 4.2). Error
    //                 isolation per branch via tryCatchAsync (Task 4.1).
    //
    // Note: a plain `next: ['a','b','c']` is `isStaticRoute` → pre-walked
    // by `staticPreChain` as the legacy explicit sequential chain. Only
    // `{ many: [...] }` reaches the multi-id branch here.
    type Dispatch =
      | { kind: 'single'; preChain: string[] }
      | { kind: 'many'; branches: string[][] };

    const dispatch: Dispatch = staticPreChain
      ? { kind: 'single', preChain: staticPreChain }
      : next !== undefined
        ? (() => {
            const ids = getNextSteps(next, buildCacheContext(currentIngest));
            if (ids.length === 0)
              return { kind: 'single', preChain: [] } as Dispatch;
            if (ids.length === 1)
              return {
                kind: 'single',
                preChain: walkChain(
                  ids[0],
                  extractTransformerNextMap(collector.transformers),
                ),
              } as Dispatch;
            return {
              kind: 'many',
              branches: ids.map((id) =>
                walkChain(
                  id,
                  extractTransformerNextMap(collector.transformers),
                ),
              ),
            } as Dispatch;
          })()
        : ({ kind: 'single', preChain: [] } as Dispatch);

    // Push each event independently through the post-before pipeline.
    // For non-fan-out (single event) this is a one-iteration loop and
    // behaves exactly like the previous implementation.
    let pushResult: Elb.PushResult = { ok: true } as Elb.PushResult;
    for (const event of events) {
      if (dispatch.kind === 'many') {
        // `many` fan-out: each branch is an independent terminal flow.
        // Per-branch ingest clone, no respond propagation, error isolation
        // via tryCatchAsync. Branch results are awaited and discarded;
        // currentRespond is NOT updated from any branch.
        await Promise.all(
          dispatch.branches.map((branchChain, idx) =>
            tryCatchAsync(
              async () =>
                collector.push(event, {
                  ...options,
                  id: sourceId,
                  ingest: cloneIngest(currentIngest, `${sourceId}:${idx}`),
                  respond: undefined,
                  mapping: config,
                  preChain: branchChain,
                }),
              (err) => {
                collector.logger
                  .scope('source:many')
                  .error(`many branch ${idx} failed`, { error: err });
                return { ok: true } as Elb.PushResult;
              },
            )(),
          ),
        );
        // `many` is fan-out, not enrichment — surface a generic OK.
        pushResult = { ok: true } as Elb.PushResult;
      } else {
        pushResult = await collector.push(event, {
          ...options,
          id: sourceId,
          ingest: currentIngest,
          respond: currentRespond,
          mapping: config,
          preChain: dispatch.preChain,
        });
      }
    }

    // Wait for any deferred MISS update work to land on the source's
    // respond sender before returning control to the source. This
    // ensures source-level fallbacks (e.g. transparent GIFs) run after
    // the real response has been committed via first-call-wins.
    if (pendingRespond) await pendingRespond;

    return pushResult;
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

  // Pass 1: register every source via its factory.
  for (const [sourceId, sourceDefinition] of Object.entries(sources)) {
    const sourceInstance = await initSource(
      collector,
      sourceId,
      sourceDefinition,
    );
    if (!sourceInstance) continue;
    // Propagate orchestration fields from the user's source definition into
    // the registered instance config. The factory does not know about
    // `require` — it's an InitSource-level concern that the collector owns.
    // Clone the array so per-source decrement (in onApply) doesn't mutate
    // the caller's config.
    const userRequire = sourceDefinition.config?.require;
    sourceInstance.config = {
      ...sourceInstance.config,
      init: false,
      ...(userRequire ? { require: [...userRequire] } : {}),
    };
    result[sourceId] = sourceInstance;
  }

  // Merge into collector.sources BEFORE pass 2 so that any onApply
  // broadcast triggered during init can find every source.
  Object.assign(collector.sources, result);

  // Pass 2: init each source. Side effects allowed here.
  for (const sourceId of Object.keys(result)) {
    const instance = collector.sources[sourceId];
    if (instance.init) {
      await tryCatchAsync(instance.init.bind(instance))();
    }
    instance.config.init = true;
    if (isSourceStarted(instance)) {
      await flushSourceQueueOn(collector, instance);
    }
  }

  return result;
}
