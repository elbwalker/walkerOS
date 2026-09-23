import type {
  Cache,
  Collector,
  Elb,
  Ingest,
  Source,
  Transformer,
  WalkerOS,
} from '@walkeros/core';
import type { RespondFn, RespondOptions } from '@walkeros/core';
import {
  createIngest,
  FatalError,
  getMappingValue,
  getSpanId,
  parseTraceparent,
  isScope,
  tryCatchAsync,
  compileCache,
  checkCache,
  storeCache,
  applyUpdate,
  createMappingRoot,
  compileState,
  applyState,
} from '@walkeros/core';
import { runTransformerChain } from './transformer';
import { buildReportError, errorMeta } from './report-error';
import { isStateDelivery, shouldDeliver, setMark } from './on';
import { reconcilePending } from './pending';
import { createPushResult } from './destination';
import { emitCollectorDrop } from './observerEmit';
import { getCacheStore, getStateStore } from './cache';

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
 *
 * State-delivery entries (consent/user/globals/custom) are gated through the
 * same per-source high-water mark as the direct `onApply` broadcast: while
 * `!allowed` they defer (not invoked, mark not advanced — the source stays
 * "owed" for the run-barrier re-delivery), and an allowed delivery advances
 * the source mark so a later broadcast at the same version does not double
 * deliver. Lifecycle/arbitrary entries (ready/run/session/config) flush with
 * their unchanged behavior.
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
    // Defer state deliveries while !allowed: leave them owed (drop the queued
    // entry without firing or advancing the mark). The run-barrier re-delivery
    // (a later task) re-broadcasts owed state to behind-mark subscribers.
    if (isStateDelivery(type) && !shouldDeliver(collector, source, type))
      continue;

    await tryCatchAsync(source.on, (err: unknown): undefined => {
      if (err instanceof FatalError) throw err;
      collector.status.failed++;
      collector.logger.scope('source').error('source on flush failed', {
        sourceId: id,
        type,
        ...errorMeta(err),
      });
      return undefined;
    })(type, data);

    if (isStateDelivery(type)) setMark(collector, source, type);
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
    terminus,
  } = sourceDefinition;

  // Compile declarative state entries once. For a source, all state entries
  // run before handing the event to `collector.push` (get enriches the event
  // the collector receives, set stashes from it), so they execute together in
  // array order. A config-level `state` takes precedence over the
  // definition-level one.
  const sourceState = config.state ?? sourceDefinition.state;
  const stateEntries = sourceState ? compileState(sourceState) : undefined;

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

  // The pipeline's end. `terminus` replaces the collector entirely; see the
  // field's doc on Source.InitSource for the full (total) semantics.
  const terminalPush: Collector.PushFn = terminus ?? collector.push;
  const hasTerminus = Boolean(terminus);

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
    // Total bypass: the terminus owns the pipeline and receives the raw event.
    // One early return instead of a per-stage conditional, so "bypass" cannot
    // drift into "bypass some stages".
    if (hasTerminus) return terminalPush(rawEvent);

    let pendingRespond: Promise<void> | undefined;

    // Mint the event's span id HERE when absent, so the source.before chain's
    // records carry the same id as the collector.push and destination records
    // of the same event; minting only at the collector wrap would leave every
    // before-chain record anonymous. The wrap then finds `id` set and keeps
    // it, as does `createEvent` (handle.ts): one span per event, end to end.
    const identified =
      typeof rawEvent.id === 'string' && rawEvent.id !== ''
        ? rawEvent
        : { ...rawEvent, id: getSpanId() };

    // The before chain may fan out (return an array of events). The cache
    // check and destination push must run once per event so fan-out is
    // preserved end-to-end. Cache logic is request-scoped (keyed by the
    // scope's ingest), so it lives outside the loop. The actual pipeline
    // (preChain + collector.push) runs inside the loop, once per event.
    let copies: Transformer.ChainCopy[] = [
      { event: identified, ingest: scope.ingest },
    ];

    // Run source.before chain (consent-exempt, pre-source preprocessing).
    // The route resolves hop by hop with `{ ingest, event }`, the event being
    // the source's raw output with its span id already minted.
    if (before !== undefined) {
      const chainPath = `source.${sourceId}.before`;
      const beforeResult = await runTransformerChain(
        collector,
        collector.transformers || {},
        before,
        identified,
        scope.ingest,
        scope.respond,
        chainPath,
      );
      if (beforeResult.copies.length === 0) {
        // Dropped or stopped: the event never reaches the collector.
        emitCollectorDrop(
          collector,
          identified,
          scope.ingest,
          beforeResult.droppedBy,
          chainPath,
        );
        return createPushResult({ ok: true, dropped: true });
      }
      // Pipeline-halt signal from a `cache.stop: true` HIT inside the
      // source.before chain. Do NOT invoke collector.push — drop the event
      // before it enters the collector pipeline.
      if (beforeResult.stopped) {
        if (beforeResult.respond) scope.respond = beforeResult.respond;
        return { ok: true } as Elb.PushResult;
      }
      if (beforeResult.respond) scope.respond = beforeResult.respond;

      // Every finished copy goes on with its own ingest and the id the
      // runner gave it (a single copy keeps the source-minted id).
      copies = beforeResult.copies;
    }

    // Source cache check (full=true by default for sources)
    if (compiledSourceCache) {
      const cacheStore = getCacheStore(compiledSourceCache, collector);
      if (cacheStore) {
        const cacheContext = createMappingRoot(scope.ingest);
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

    // Apply declarative state per event before handing off to the collector.
    // Entries run sequentially in array order at this single pipeline point.
    if (stateEntries && stateEntries.length > 0) {
      copies = await Promise.all(
        copies.map(async (copy) => ({
          event: await applyState(
            stateEntries,
            (id) => getStateStore(id, collector),
            copy.event,
            collector,
            copy.ingest,
          ),
          ingest: copy.ingest,
        })),
      );
    }

    // Push each event independently through the post-before pipeline. The
    // source's `next` route travels as the pre-collector chain and resolves
    // per event, after the source's state, inside `collector.push`.
    let pushResult: Elb.PushResult = { ok: true } as Elb.PushResult;
    for (const copy of copies) {
      pushResult = await terminalPush(copy.event, {
        ...options,
        id: sourceId,
        ingest: copy.ingest,
        respond: scope.respond,
        mapping: config,
        preChain: next,
      });
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
  const extractIngest = async (
    rawScope: Source.Scope | undefined,
  ): Promise<Ingest> => {
    const fresh = createIngest(sourceId);
    // Adopt an inbound W3C traceparent from the scope's header bag so every
    // server source gains trace continuity + parent-span linkage. The final
    // return reuses `fresh._meta` by reference, so stamping here holds for
    // both the mapped and unmapped paths. Sources can be user authored, so the
    // declared type is not assumed to hold at runtime; a miss resolves
    // nothing, which is the honest outcome.
    const traceparent = parseTraceparent(
      isScope(rawScope) ? rawScope?.headers?.traceparent : undefined,
    );
    if (traceparent) {
      fresh._meta.trace = traceparent.trace;
      fresh._meta.parentEventId = traceparent.parentSpan;
    }
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

  // `env` is the source's dependency bag: the author owns it. The five
  // capabilities the collector provides are applied LAST so they always win,
  // uniformly. Writing one of them in `env` is therefore inert rather than
  // partially effective; to end the pipeline somewhere else, use
  // `InitSource.terminus`, which says so explicitly.
  const cleanEnv: Source.Env = {
    ...env,
    push: wrappedPush,
    command: collector.command,
    sources: collector.sources,
    elb: collector.elb,
    logger: initialLogger,
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
    reportError: buildReportError(collector, 'source', sourceId, initialLogger),
  };

  const sourceInstance = await tryCatchAsync(
    code,
    (err: unknown): undefined => {
      if (err instanceof FatalError) throw err;
      collector.status.failed++;
      collector.logger.scope('source').error('source factory failed', {
        sourceId,
        ...errorMeta(err),
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
          ...errorMeta(err),
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

  // Registration trigger: a source's factory or init (Pass 2) may have recorded
  // state that satisfies another source's/destination's `require`. The live
  // broadcast can miss a step that was not yet merged into collector.sources
  // when the state fired (a factory emit during Pass 1), so reconcile once over
  // the now-fully-registered set to activate any step satisfied by current
  // state. This is the load-bearing fix for order-independent activation.
  await reconcilePending(collector);

  return result;
}
