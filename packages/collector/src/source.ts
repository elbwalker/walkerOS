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
  FatalError,
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
 *
 * A throw inside `source.on` is treated as a pipeline failure: log via the
 * scoped 'source' logger and increment `status.failed`. The flush itself
 * is walkerOS-orchestrated startup; the throw represents the source's
 * inability to consume a buffered state-change event.
 */
export async function flushSourceQueueOn(
  collector: Collector.Instance,
  source: Source.Instance,
  sourceId?: string,
): Promise<void> {
  if (!source.on || !source.queueOn?.length) return;
  const queue = source.queueOn;
  source.queueOn = [];
  const id = sourceId || source.config?.id || 'unknown';
  for (const { type, data } of queue) {
    await tryCatchAsync(source.on, (err: unknown): undefined => {
      if (err instanceof FatalError) throw err;
      collector.status.failed++;
      collector.logger.scope('source').error('source on flush failed', {
        sourceId: id,
        type,
        error: err,
      });
      return undefined;
    })(type, data);
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

  // Terminal push: where the source pipeline ends. Defaults to
  // `collector.push`. Tests (and rare advanced consumers) may override by
  // passing `push` in the source's `env`; in that case the override
  // replaces the collector and receives the raw event with no pipeline
  // options. Per-scope ingest/respond is invisible to overriders by
  // design: overriders are responsible for their own pipeline shape.
  const userTerminalPush = (env as { push?: Collector.PushFn }).push;
  const terminalPush: Collector.PushFn = userTerminalPush ?? collector.push;
  const hasUserTerminalPush = Boolean(userTerminalPush);

  /**
   * Execute the source pipeline for a single push call. Operates ONLY on
   * the per-call `scope` parameter — never reads source-factory closure
   * variables for ingest/respond. The scope is the unit of cross-request
   * isolation.
   *
   * The function may mutate `scope.respond` (cache MISS wraps it to
   * intercept the cached value before forwarding). That mutation is
   * scope-local: a concurrent call with its own scope is unaffected.
   */
  const executePush = async (
    rawEvent: WalkerOS.DeepPartialEvent,
    options: Collector.PushOptions,
    scope: { ingest: Ingest; respond: RespondFn | undefined },
  ): Promise<Elb.PushResult> => {
    let pendingRespond: Promise<void> | undefined;

    // Resolve before chain (static or conditional).
    // Single-id results walk static `.next` links; multi-id results are
    // explicit chains (fan-out from `many` is handled by the engine).
    const beforeChain =
      staticBeforeChain ??
      (before !== undefined
        ? (() => {
            const ids = getNextSteps(before, buildCacheContext(scope.ingest));
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
    // preserved end-to-end. Cache logic is request-scoped (keyed by the
    // scope's ingest), so it lives outside the loop. The actual pipeline
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
        scope.ingest,
        scope.respond,
        `source.${sourceId}.before`,
      );
      if (beforeResult.event === null) {
        return { ok: true } as Elb.PushResult;
      }
      // Pipeline-halt signal from a `cache.stop: true` HIT inside the
      // source.before chain. Do NOT invoke collector.push — drop the event
      // before it enters the collector pipeline.
      if (beforeResult.stopped) {
        if (beforeResult.respond) scope.respond = beforeResult.respond;
        return { ok: true } as Elb.PushResult;
      }
      if (beforeResult.respond) scope.respond = beforeResult.respond;
      events = Array.isArray(beforeResult.event)
        ? beforeResult.event
        : [beforeResult.event];
    }

    // Source cache check (full=true by default for sources)
    if (compiledSourceCache) {
      const cacheStore = getCacheStore(compiledSourceCache, collector);
      if (cacheStore) {
        const cacheContext = buildCacheContext(scope.ingest);
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
              scope.respond?.(respondValue as Record<string, unknown>);
              return { ok: true } as Elb.PushResult;
            }
            // stop=false: cached value unused — HIT signals "seen before", pipeline continues
          }

          if (
            cacheResult.status === 'MISS' &&
            compiledSourceCache.stop &&
            scope.respond
          ) {
            // stop=true MISS: wrap respond to intercept and cache the value.
            // Store original in cache, then apply update rules with MISS
            // status before responding (mirrors HIT path which applies
            // with HIT status).
            //
            // When `update` is configured the update step is async, so
            // the wrapper captures its promise in `pendingRespond`.
            // `executePush` awaits that promise before returning, so any
            // source fallback that runs after `await env.push(...)` (e.g.
            // the express source's transparent-GIF default) sees
            // `createRespond`'s first-call-wins flag already set and
            // correctly no-ops. Without this, the fallback would win
            // the race and the real response would be lost.
            const unwrappedRespond = scope.respond;
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

            scope.respond = missRespond;
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
    //                 (no-respond-across-many doctrine). Error isolation
    //                 per branch via tryCatchAsync.
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
            const ids = getNextSteps(next, buildCacheContext(scope.ingest));
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
        // scope.respond is NOT updated from any branch.
        await Promise.all(
          dispatch.branches.map((branchChain, idx) =>
            tryCatchAsync(
              async () =>
                hasUserTerminalPush
                  ? terminalPush(event)
                  : terminalPush(event, {
                      ...options,
                      id: sourceId,
                      ingest: cloneIngest(scope.ingest, `${sourceId}.${idx}`),
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
      } else if (hasUserTerminalPush) {
        // User override: bypass the pipeline, deliver raw events. This
        // preserves the `env.push: mockPush` test spy pattern.
        pushResult = await terminalPush(event);
      } else {
        pushResult = await terminalPush(event, {
          ...options,
          id: sourceId,
          ingest: scope.ingest,
          respond: scope.respond,
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

  /**
   * Build a fresh per-scope `Ingest` from raw scope input by applying
   * `config.ingest` mapping if present. Always produces a typed Ingest
   * with valid `_meta`. Pure: returns a new object, never reads or
   * writes source-factory state.
   */
  const extractIngest = async (rawScope: unknown): Promise<Ingest> => {
    const fresh = createIngest(sourceId);
    if (!config.ingest || rawScope === undefined) return fresh;
    const extracted = await getMappingValue(rawScope, config.ingest, {
      collector,
    });
    return {
      ...fresh,
      ...(extracted as Record<string, unknown>),
      _meta: fresh._meta, // protect _meta from being overwritten
    };
  };

  // Factory-default push: each call gets a fresh Ingest and no respond.
  // Sources with a single logical scope (browser, dataLayer) call this
  // directly via `env.push`. Server sources handling concurrent requests
  // call `context.withScope(...)` instead, which threads a per-scope
  // ingest/respond into the same pipeline.
  const wrappedPush: Collector.PushFn = async (
    rawEvent: WalkerOS.DeepPartialEvent,
    options: Collector.PushOptions = {},
  ) => {
    const scope = {
      ingest: createIngest(sourceId),
      respond: undefined as RespondFn | undefined,
    };
    return executePush(rawEvent, options, scope);
  };

  // Create initial logger scoped to sourceId (type will be added after init)
  const initialLogger = collector.logger.scope('source').scope(sourceId);

  // Build cleanEnv. User-supplied env can override every field; we
  // immediately overwrite `push` with the source-pipeline `wrappedPush`.
  // Any user-supplied `env.push` was captured above as `terminalPush`
  // (the pipeline's terminus, not the source's outward-facing push).
  const cleanEnv: Source.Env = {
    command: collector.command,
    sources: collector.sources,
    elb: collector.sources.elb.push,
    logger: initialLogger,
    ...env,
    push: wrappedPush,
  };

  /**
   * Bind ingest and respond to a single scope of work. Each invocation
   * builds a fresh `Ingest`, captures the given `respond`, and runs the
   * caller's `body` with a per-scope env whose `push` carries both. The
   * scope is the unit of cross-call isolation — concurrent withScope
   * invocations never share ingest or respond.
   */
  const withScope: Source.Context['withScope'] = async (
    rawScope,
    respond,
    body,
  ) => {
    const scope: { ingest: Ingest; respond: RespondFn | undefined } = {
      ingest: await extractIngest(rawScope),
      respond,
    };
    const scopePush: Collector.PushFn = (rawEvent, options = {}) =>
      executePush(rawEvent, options, scope);
    const scopeEnv: Source.ScopeEnv = {
      ...cleanEnv,
      push: scopePush,
      ingest: scope.ingest,
      respond: scope.respond,
    };
    return body(scopeEnv);
  };

  const sourceContext: Source.Context = {
    collector,
    logger: initialLogger,
    id: sourceId,
    config,
    env: cleanEnv,
    withScope,
  };

  const sourceInstance = await tryCatchAsync(
    code,
    (err: unknown): undefined => {
      if (err instanceof FatalError) throw err;
      collector.status.failed++;
      collector.logger.scope('source').error('source factory failed', {
        sourceId,
        error: err,
      });
      return undefined;
    },
  )(sourceContext);
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
    let initFailed = false;
    if (instance.init) {
      await tryCatchAsync(instance.init.bind(instance), (err: unknown) => {
        if (err instanceof FatalError) throw err;
        initFailed = true;
        collector.status.failed++;
        collector.logger.scope('source').error('source init failed', {
          sourceId,
          error: err,
        });
      })();
    }
    // Control-flow fix: a throw inside `init()` previously left the source
    // marked `config.init = true` despite never having completed setup.
    // Operators reading `source.config.init` would see a healthy source
    // that was actually broken. Skip the rest of the loop on failure so
    // the source stays in `config.init = false` and is visibly stuck.
    if (initFailed) continue;
    instance.config.init = true;
    if (isSourceStarted(instance)) {
      await flushSourceQueueOn(collector, instance, sourceId);
    }
  }

  return result;
}
