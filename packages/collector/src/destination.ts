import type {
  Cache,
  Collector,
  WalkerOS,
  Elb,
  Destination,
  Transformer,
  Ingest,
  Simulation,
} from '@walkeros/core';
import {
  assign,
  buildCacheContext,
  clone,
  compileCache,
  checkCache,
  storeCache,
  createIngest,
  debounce,
  emitStep,
  getId,
  getGrantedConsent,
  getNextSteps,
  isDefined,
  isFunction,
  isObject,
  OBSERVE_ENV_KEY,
  processEventMapping,
  stepId,
  tryCatchAsync,
  useHooks,
  compileState,
  applyState,
} from '@walkeros/core';
import { buildBaseState, journeyFields } from './observerEmit';
import { wrapEnv } from './wrapEnv';
import { sanitizeCalls } from './sanitizeArgs';
import { callDestinationOn } from './on';
import {
  runTransformerChain,
  walkChain,
  extractTransformerNextMap,
  extractChainProperty,
} from './transformer';
import { getCacheStore, getStateStore } from './cache';
import { pushBounded, resetOverflowFlag, warnOverflowOnce } from './buffers';
import {
  DEFAULT_DLQ_MAX,
  bumpDropped,
  ensureDestStatus,
  buildReportError,
} from './report-error';
import { reconcilePending } from './pending';
import {
  isBreakerOpen,
  recordStepOutcome,
  releaseProbe,
  resolveBreakerConfig,
} from './breaker';

const DEFAULT_QUEUE_MAX = 1_000;
/** Default upper-bound on entries per batch. Caps unbounded growth under sustained load. */
const DEFAULT_BATCH_SIZE = 1_000;
/** Default upper-bound on batch age in ms. Forces flush even if debounce keeps resetting. */
const DEFAULT_BATCH_AGE = 30_000;
/**
 * Default per-destination delivery timeout in ms. Applied when a destination's
 * `config.timeout` is `0` or undefined. A hung delivery is converted into a
 * counted DLQ failure after this window so one slow destination never wedges
 * the collector push.
 */
const DEFAULT_DESTINATION_TIMEOUT_MS = 10_000;

/**
 * Resolve the effective delivery timeout for a destination. A positive number
 * wins; `0` or undefined falls back to {@link DEFAULT_DESTINATION_TIMEOUT_MS}.
 */
function resolveDestinationTimeout(timeout?: number): number {
  return typeof timeout === 'number' && timeout > 0
    ? timeout
    : DEFAULT_DESTINATION_TIMEOUT_MS;
}

/**
 * Error thrown when a destination delivery does not settle within its timeout.
 * The dedicated `name` lets DLQ consumers discriminate a timeout from a
 * destination-thrown error without substring matching the message.
 */
class DestinationTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DestinationTimeoutError';
  }
}

/**
 * Races a delivery promise against a per-destination timeout. If the work does
 * not settle within `ms`, the returned promise rejects with a
 * {@link DestinationTimeoutError}; the timer is always cleared on settle so no
 * dangling timer remains. The race is constructed per call site, so each
 * destination times out independently and one hang never affects another.
 */
function withTimeout<T>(
  work: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DestinationTimeoutError(message)), ms);
  });
  return Promise.race([work, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Sentinel returned by {@link destinationPush} when an event was enqueued
 * into a batch (not delivered synchronously). The aggregation pass in
 * {@link pushToDestinations} reads this to skip the per-event `count`
 * increment; counters are bumped by the flush callback instead, after
 * `pushBatch` resolves. Per PROD-004 plan Q9: increment on successful
 * flush per entry, not on enqueue.
 */
const BATCHED_RESULT: { batched: true } = Object.freeze({ batched: true });

function isBatchedResult(value: unknown): boolean {
  return value === BATCHED_RESULT;
}

/**
 * Narrows a `pushBatch` return value to a {@link Destination.BatchOutcome}.
 * A destination returning `void` (the historical contract) yields whole-batch
 * semantics and never enters the partial-failure path.
 */
function isBatchOutcome(value: unknown): value is Destination.BatchOutcome {
  return (
    isObject(value) && Array.isArray((value as { failed?: unknown }).failed)
  );
}

/**
 * Reserved buffer key for the destination-wide default batch created by
 * `config.batch`. A produced mappingKey is `"<entity> <action>"` with both
 * segments guaranteed non-empty (getMappingEvent returns no key when either
 * is empty, packages/core/src/mapping.ts:24-25), so no event-derived key can
 * begin with a space. The leading space here therefore never collides with a
 * rule buffer or the `'* *'` fallback.
 */
const BATCH_ALL_KEY = ' batch-all';

/**
 * Normalize a batch config value to the canonical `{ wait?, size?, age? }`
 * shape. A bare number is treated as `wait` (legacy form). `undefined`
 * normalizes to an empty object so callers can chain `??` lookups.
 */
function normalizeBatchOptions(
  value: number | Destination.BatchOptions | undefined,
): { wait?: number; size?: number; age?: number } {
  if (value === undefined) return {};
  if (typeof value === 'number') return { wait: value };
  return { wait: value.wait, size: value.size, age: value.age };
}

/**
 * Resolves transformer chain for a destination.
 *
 * `getNextSteps` returns the immediate next-step ids for the given Route in
 * the supplied context. `walkChain` then follows static `.next` links from
 * each entry to produce the full ordered chain. The WeakMap inside
 * `getNextSteps` caches the compiled form, so we don't re-compile per event.
 *
 * post-collector destination.before disallows `many` (enforced at the schema
 * layer via `RouteWithoutManySchema`), so we never see more than one id here
 * unless a user passes an explicit string[] chain — in which case we want to
 * treat it as the explicit chain (no further walking).
 *
 * `transformerNextMap` is computed once per `pushToDestinations` call (it depends
 * only on `collector.transformers`) and passed in to avoid rebuilding it for
 * every destination's before and next chain resolution.
 */
function resolveDestinationChain(
  before: Transformer.Route | undefined,
  transformerNextMap: ReturnType<typeof extractTransformerNextMap>,
  ingest?: Ingest,
): string[] {
  if (!before) return [];
  // Static string[] chains pass through unchanged — they are explicit and
  // suppress `.next` walking. Static single-string starts are walked.
  if (
    Array.isArray(before) &&
    before.every((entry) => typeof entry === 'string')
  ) {
    return walkChain(before, transformerNextMap);
  }
  if (typeof before === 'string') {
    return walkChain(before, transformerNextMap);
  }
  // Conditional shape — resolve per-event, walk single-id result.
  const ids = getNextSteps(before, buildCacheContext(ingest));
  if (ids.length === 0) return [];
  if (ids.length === 1) return walkChain(ids[0], transformerNextMap);
  // Multiple ids from a conditional shape: treat as explicit chain.
  // (destination.before disallows `many`; this path is reached only if a
  // RouteConfig.next resolves to a string[], which is then the user's
  // declared chain.)
  return walkChain(ids, transformerNextMap);
}

/**
 * Adds a new destination to the collector.
 *
 * @param collector - The walkerOS collector instance.
 * @param data - The destination's init data.
 * @returns The result of the push operation.
 */
export async function addDestination(
  collector: Collector.Instance,
  data: Destination.Init,
): Promise<Elb.PushResult> {
  const {
    code,
    config: dataConfig = {},
    env = {},
    before,
    next,
    cache,
    state,
  } = data;

  // Validate that code has a push method
  if (!isFunction(code.push)) {
    return createPushResult({
      ok: false,
      failed: {
        invalid: {
          type: 'invalid',
          error: 'Destination code must have a push method',
        },
      },
    });
  }

  const baseConfig = dataConfig || { init: false };
  // Merge before, next, and cache into config if provided at root level
  let config = before ? { ...baseConfig, before } : { ...baseConfig };
  if (next) config = { ...config, next };
  if (cache) config = { ...config, cache };
  if (state !== undefined && config.state === undefined)
    config = { ...config, state };

  let id = config.id; // Use given id
  if (!id) {
    // Generate a new id if none was given (lowercase alpha only for readability)
    do {
      id = getId(5, 'abcdefghijklmnopqrstuvwxyz');
    } while (collector.destinations[id] || collector.pending.destinations[id]);
  }

  // Honor `require`: a runtime destination with a require gate must wait for the
  // collector's current state to satisfy it, exactly like a startup destination
  // (initDestinations). Without this, addDestination registered + pushed
  // regardless of require. Route it through pending + reconcile: reconcile
  // activates it immediately if current state already satisfies it, otherwise it
  // stays pending until a later state change/run reconcile.
  if (config.require?.length) {
    // Store the raw Init def (before/next/cache/state at root) exactly as
    // initDestinations does; registerDestination folds the chain props on
    // activation. The map key carries the resolved id.
    collector.pending.destinations[id] = data;
    await reconcilePending(collector);
    const activated = collector.destinations[id];
    if (activated) {
      return pushToDestinations(collector, undefined, {}, { [id]: activated });
    }
    return createPushResult({ ok: true });
  }

  const destination: Destination.Instance = {
    ...code,
    config,
    env: mergeEnvironments(code.env, env),
  };

  // Add the destination
  collector.destinations[id] = destination;

  // Process previous events if not disabled
  if (destination.config.queue !== false)
    destination.queuePush = [...collector.queue];

  return pushToDestinations(collector, undefined, {}, { [id]: destination });
}

/**
 * Pushes an event to all or a subset of destinations.
 *
 * @param collector - The walkerOS collector instance.
 * @param event - The event to push.
 * @param meta - Optional metadata with id and ingest.
 * @param destinations - The destinations to push to.
 * @returns The result of the push operation.
 */
export async function pushToDestinations(
  collector: Collector.Instance,
  event?: WalkerOS.Event,
  meta: {
    id?: string;
    ingest?: Ingest;
    respond?: import('@walkeros/core').RespondFn;
  } = {},
  destinations?: Collector.Destinations,
): Promise<Elb.PushResult> {
  const { allowed, consent, globals, user } = collector;

  // Check if collector is allowed to push
  if (!allowed) return createPushResult({ ok: false });

  // Add event to the collector queue (bounded; FIFO drop-oldest on overflow)
  if (event) {
    const queueMax = collector.config.queueMax;
    if (queueMax === undefined) {
      throw new Error(
        'Collector.Config.queueMax is undefined; defaults must be seeded by collector()',
      );
    }
    const result = pushBounded(collector.queue, event, { max: queueMax });
    if (result.dropped > 0) {
      const droppedCount = bumpDropped(
        collector.status,
        stepId('collector'),
        'queue',
        result.dropped,
      );
      warnOverflowOnce(
        collector.queue,
        collector.logger,
        'collector.queue overflow; oldest events dropped',
        {
          buffer: 'queue',
          cap: queueMax,
          droppedCount,
        },
      );
    } else if (collector.queue.length < queueMax) {
      resetOverflowFlag(collector.queue);
    }
    collector.status.in++;
  }

  // Use given destinations or use internal destinations
  if (!destinations) destinations = collector.destinations;

  // Precompute the transformer next map once per push (shared across all
  // destinations in this batch, used for both before and next chain resolution).
  // Guarded because tests and partially-initialized collectors may pass
  // `transformers` as undefined.
  const transformerNextMap = collector.transformers
    ? extractTransformerNextMap(collector.transformers)
    : {};

  const results = await Promise.all(
    // Process all destinations in parallel
    Object.entries(destinations || {}).map(async ([id, destination]) => {
      // Disabled destinations are completely skipped — no queuing, no init, no processing
      if (destination.config.disabled) {
        return { id, destination, skipped: true };
      }

      // Canonical id: the breaker gate, the failure/success accounting, and any
      // aggregation MUST all key on the SAME id. A destination whose runtime
      // `config.id` differs from its map key would otherwise touch two
      // different breaker entries (gate vs accounting), so failures never
      // accumulate against the entry the gate inspects and the breaker never
      // opens. Resolve once here and thread it through the result.
      const canonicalId = destination.config.id || id;
      const breakerKey = stepId('destination', canonicalId);
      const breakerConfig = resolveBreakerConfig(destination.config.breaker);

      // Circuit-breaker gate (same precedence as `config.disabled`): when the
      // breaker is open, skip the event (counted as skipped, never pushed).
      // Presence-gated: inert unless `config.breaker` is set.
      if (
        breakerConfig &&
        isBreakerOpen(
          collector.status.breakers,
          breakerKey,
          breakerConfig.cooldown,
        )
      ) {
        return { id, destination, skipped: true };
      }

      // Probe-settle helpers. When the gate above admitted a half-open probe,
      // EVERY post-gate path must settle it: either record an outcome (the
      // event reached the transport) or release the probe (it never did).
      // Otherwise `probing` stays true and the breaker deadlocks half-open.
      // Both are presence-gated and internally no-op unless half-open+probing.
      const recordProbe = (outcome: 'transport-failure' | 'success') => {
        if (breakerConfig) {
          recordStepOutcome(
            collector.status.breakers,
            breakerKey,
            outcome,
            breakerConfig.threshold,
            breakerConfig.cooldown,
          );
        }
      };
      const releaseProbeSlot = () => {
        if (breakerConfig) releaseProbe(collector.status.breakers, breakerKey);
      };

      // Queued events: refresh consent (full replace — stale consent must not persist).
      // User/globals merge happens for all events below in allowedEvents.map.
      let currentQueue = (destination.queuePush || []).map((event) => ({
        ...event,
        consent,
      }));
      destination.queuePush = [];

      // Current event: added as-is (consent is already fresh from createEvent).
      if (event) currentQueue.push(clone(event));

      // Clone ingest for this destination (prevents cross-destination races in Promise.all)
      const destIngest: Ingest = meta.ingest
        ? {
            ...meta.ingest,
            _meta: { ...meta.ingest._meta, path: [...meta.ingest._meta.path] },
          }
        : createIngest('unknown');

      // If no events and no queued on events, skip this destination
      if (!currentQueue.length && !destination.queueOn?.length) {
        releaseProbeSlot(); // probe admitted but no event to push
        return { id, destination, skipped: true };
      }

      // If only on events queued (no push events), still init to flush queueOn.
      // Direct try/catch + logger.error here is intentional. Previously this
      // used tryCatchAsync(destinationInit) without an onError callback, which
      // silently returned undefined when init threw, hiding real failures on
      // the queueOn-only path. Mirrors the same pattern used below at the main
      // init call site so failures are never silent on either branch.
      if (!currentQueue.length && destination.queueOn?.length) {
        // Consent gate (sole-gate invariant): this branch would init the
        // destination purely to flush queued on() events, but there is no push
        // event whose individual consent could apply, so collector consent is
        // the complete basis. Never init a consent-gated destination while its
        // required consent is denied. Self-heals: handle.ts runs
        // pushToDestinations after every state command, so the grant command
        // re-enters here with consent satisfied and inits then.
        if (!getGrantedConsent(destination.config.consent, consent)) {
          releaseProbeSlot(); // probe admitted but consent gate denies push
          return { id, destination, skipped: true };
        }
        let isInitialized = false;
        try {
          isInitialized = await destinationInit(
            collector,
            destination,
            id,
            true,
          );
        } catch (err) {
          collector.status.failed++;
          const destType = destination.type || 'unknown';
          collector.logger.scope(destType).error('destination init failed', {
            error: err instanceof Error ? err.message : String(err),
          });
          // A probe whose init throws is a real transport failure: re-open.
          recordProbe('transport-failure');
        }
        // queueOn-only flush exercises no push, so a successful/false-returning
        // init releases the probe (the transport-failure path already re-opened
        // it, where release is a no-op).
        releaseProbeSlot();
        return { id, destination, skipped: !isInitialized };
      }

      const allowedEvents: WalkerOS.Events = [];
      const skippedEvents = currentQueue.filter((queuedEvent) => {
        const grantedConsent = getGrantedConsent(
          destination.config.consent, // Required
          consent, // Current collector state
          queuedEvent.consent, // Individual event state
        );

        if (grantedConsent) {
          queuedEvent.consent = grantedConsent; // Save granted consent states only

          allowedEvents.push(queuedEvent); // Add to allowed queue
          return false; // Remove from destination queue
        }

        // Emit a skip state for the consent-denied event so observers can
        // see the gate decision per-event.
        const skipState = buildBaseState(collector, {
          stepId: stepId('destination', id),
          stepType: 'destination',
          phase: 'skip',
          eventId: typeof queuedEvent.id === 'string' ? queuedEvent.id : '',
          now: Date.now(),
          ...journeyFields(queuedEvent, destIngest, collector),
        });
        skipState.skipReason = 'consent';
        if (consent) skipState.consent = { ...consent };
        if (destination.config.consent) {
          skipState.meta = { required: { ...destination.config.consent } };
        }
        emitStep(collector, skipState);

        return true; // Keep denied events in the queue
      });

      // Add skipped (consent-denied) events back to the queue.
      // Bounded; FIFO drop-oldest on overflow.
      if (skippedEvents.length > 0) {
        const queuePush = destination.queuePush;
        const destId = destination.config.id || id;
        const bound = {
          max: destination.config.queueMax ?? DEFAULT_QUEUE_MAX,
        };
        let totalDropped = 0;
        for (const skipped of skippedEvents) {
          const r = pushBounded(queuePush, skipped, bound);
          totalDropped += r.dropped;
        }
        if (totalDropped > 0) {
          // Ensure status entry exists for early-overflow paths.
          ensureDestStatus(collector, destId);
          const droppedCount = bumpDropped(
            collector.status,
            stepId('destination', destId),
            'queue',
            totalDropped,
          );
          warnOverflowOnce(
            queuePush,
            collector.logger.scope(destination.type || 'unknown'),
            'destination.queuePush overflow; oldest events dropped',
            {
              buffer: 'queuePush',
              destination: destId,
              cap: bound.max,
              droppedCount,
            },
          );
        } else if (queuePush.length < bound.max) {
          resetOverflowFlag(queuePush);
        }
      }

      // Execution shall not pass if no events are allowed
      if (!allowedEvents.length) {
        releaseProbeSlot(); // probe admitted but every event was re-queued
        return { id, destination, queue: currentQueue }; // Don't push if not allowed
      }

      // Initialize the destination if needed.
      // Direct try/catch + logger.error here is intentional. Previously this
      // used tryCatchAsync(destinationInit) without an onError callback, which
      // silently returned undefined when init threw, hiding real failures. The
      // destination itself may also log a more specific error before throwing;
      // this is the boundary safety net so failures are never silent.
      // Allowed: at least one event cleared the per-event consent gate above,
      // so initialization is authorized (true) for the chokepoint guard.
      let isInitialized = false;
      try {
        isInitialized = await destinationInit(collector, destination, id, true);
      } catch (err) {
        collector.status.failed++;
        const destType = destination.type || 'unknown';
        collector.logger.scope(destType).error('destination init failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        // A probe whose init throws is a real transport failure (the down
        // destination is exactly the one whose init throws): re-open with a
        // fresh window so self-heal does not deadlock.
        recordProbe('transport-failure');
      }

      if (!isInitialized) {
        // Init returned false (no throw): the probe never pushed, so release it
        // (no-op if the throw path above already re-opened).
        releaseProbeSlot();
        return { id, destination, queue: currentQueue };
      }

      // Process the destinations event queue
      let error: unknown;
      let response: unknown;
      if (!destination.dlq) destination.dlq = [];

      // Resolve the before chain once per destination batch (the per-event
      // resolution inside getNextSteps is WeakMap-cached, so this is cheap).
      const before = destination.config.before;
      const postChain = resolveDestinationChain(
        before,
        transformerNextMap,
        destIngest,
      );

      // Capture the next chain config; resolution happens per-event below.
      const nextConfig = destination.config.next;

      // Compile destination cache once per batch (not per-event).
      // Destination caches operate on events (HIT/MISS keyed by event fields),
      // so the rule shape is always EventCacheRule, not StoreCacheRule.
      const destCacheConfig = destination.config?.cache as
        | Cache.Cache<Cache.EventCacheRule>
        | undefined;
      const compiledDCache = destCacheConfig
        ? compileCache(destCacheConfig)
        : undefined;
      const dCacheStore = compiledDCache
        ? getCacheStore(compiledDCache, collector)
        : undefined;

      // Compile declarative state entries once per batch. `get` runs before
      // the mapping-to-payload push (so it can shape the pushed event); `set`
      // runs after a successful send.
      const dStateEntries = destination.config?.state
        ? compileState(destination.config.state)
        : undefined;
      const dStateGet = dStateEntries?.filter((entry) => entry.mode === 'get');
      const dStateSet = dStateEntries?.filter((entry) => entry.mode === 'set');

      // Process allowed events and store failed ones in the dead letter queue (DLQ)
      let totalDuration = 0;
      // Count of events enqueued into a batch in this pass; the aggregation
      // below uses this to skip the synchronous `count++` for batched events
      // (counters move to the flush callback per PROD-004 plan Q9).
      let batchedCount = 0;
      await Promise.all(
        allowedEvents.map(async (event) => {
          // Merge collector state into event (collector as base, event overrides)
          event.globals = assign(globals, event.globals);
          event.user = assign(user, event.user);

          // Full cache check: before the before chain (skips everything on HIT)
          let cacheMiss: { key: string; ttl: number } | undefined;
          if (compiledDCache?.stop && dCacheStore) {
            const cacheContext = buildCacheContext(destIngest, event);
            const cacheResult = await checkCache(
              compiledDCache,
              dCacheStore,
              cacheContext,
            );
            if (cacheResult?.status === 'HIT') {
              return event; // Skip before chain + push
            }
            if (cacheResult?.status === 'MISS') {
              cacheMiss = { key: cacheResult.key, ttl: cacheResult.rule.ttl };
            }
          }

          // Run post-collector transformer chain if configured for this destination
          let processedEvent: WalkerOS.Event | null = event;
          let destRespond = meta.respond;
          if (
            postChain.length > 0 &&
            collector.transformers &&
            Object.keys(collector.transformers).length > 0
          ) {
            const chainResult = await runTransformerChain(
              collector,
              collector.transformers,
              postChain,
              event,
              destIngest,
              meta.respond,
              `destination.${id}.before`,
            );

            if (chainResult.event === null) {
              // Chain stopped - skip this event for this destination
              return event;
            }

            // Update respond if the chain produced a wrapped one
            if (chainResult.respond) destRespond = chainResult.respond;

            // Use the processed event (cast back to full Event type)
            // Before chains use first result if fan-out occurred
            processedEvent = (
              Array.isArray(chainResult.event)
                ? chainResult.event[0]
                : chainResult.event
            ) as WalkerOS.Event;
          }

          // Step-level cache check: after before chain, skip only push on HIT
          if (compiledDCache && !compiledDCache.stop && dCacheStore) {
            const cacheContext = buildCacheContext(destIngest, processedEvent);
            const cacheResult = await checkCache(
              compiledDCache,
              dCacheStore,
              cacheContext,
            );
            if (cacheResult?.status === 'HIT') {
              return event; // Skip push — deduplicated
            }
            if (cacheResult?.status === 'MISS') {
              cacheMiss = { key: cacheResult.key, ttl: cacheResult.rule.ttl };
            }
          }

          // state[get]: enrich the event before the mapping-to-payload push.
          if (dStateGet && dStateGet.length > 0 && processedEvent) {
            processedEvent = await applyState(
              dStateGet,
              (storeId) => getStateStore(storeId, collector),
              processedEvent,
              collector,
            );
          }

          const pushStart = Date.now();
          let pushFailed = false;
          const result = await tryCatchAsync(destinationPush, (err) => {
            // Log the error with destination scope
            const destType = destination.type || 'unknown';
            collector.logger.scope(destType).error('Push failed', {
              error: err,
              event: processedEvent!.name,
            });
            error = err; // oh no
            pushFailed = true;

            // Add failed event to destinations DLQ (bounded; FIFO drop-oldest)
            const dlq = destination.dlq!;
            const destId = destination.config.id || id;
            const dlqBound = {
              max: destination.config.dlqMax ?? DEFAULT_DLQ_MAX,
            };
            const dlqResult = pushBounded(
              dlq,
              [processedEvent!, err],
              dlqBound,
            );
            if (dlqResult.dropped > 0) {
              ensureDestStatus(collector, destId);
              const droppedCount = bumpDropped(
                collector.status,
                stepId('destination', destId),
                'dlq',
                dlqResult.dropped,
              );
              warnOverflowOnce(
                dlq,
                collector.logger.scope(destination.type || 'unknown'),
                'destination.dlq overflow; oldest entries dropped',
                {
                  buffer: 'dlq',
                  destination: destId,
                  cap: dlqBound.max,
                  droppedCount,
                },
              );
            } else if (dlq.length < dlqBound.max) {
              resetOverflowFlag(dlq);
            }

            return undefined;
          })(
            collector,
            destination,
            id,
            processedEvent!,
            destIngest,
            destRespond,
          );
          totalDuration += Date.now() - pushStart;

          // Destination cache MISS: store the push result after attempt
          if (
            cacheMiss &&
            dCacheStore &&
            destination.config.mock === undefined
          ) {
            storeCache(
              dCacheStore,
              cacheMiss.key,
              result ?? true,
              cacheMiss.ttl,
            );
          }

          // state[set]: stash from the event after a successful send. A
          // batched-enqueue is not a real send (the sentinel is returned
          // before delivery), so set is deferred until flush. The flush-path
          // write is a documented follow-up, not handled here yet.
          if (
            !pushFailed &&
            !isBatchedResult(result) &&
            dStateSet &&
            dStateSet.length > 0 &&
            processedEvent
          ) {
            processedEvent = await applyState(
              dStateSet,
              (storeId) => getStateStore(storeId, collector),
              processedEvent,
              collector,
            );
          }

          // Capture the last response (for single event pushes).
          // Batched-enqueue sentinel is NOT a real response; don't surface it.
          if (result !== undefined && !isBatchedResult(result)) {
            response = result;
          }
          if (isBatchedResult(result)) batchedCount++;

          // Run destination.next chain after successful push
          if (!pushFailed && nextConfig) {
            // Write push response to ingest for destination.next transformers
            if (result !== undefined) {
              destIngest._response = result;
            }

            const nextChain = resolveDestinationChain(
              nextConfig,
              transformerNextMap,
              destIngest,
            );

            if (
              nextChain.length > 0 &&
              collector.transformers &&
              Object.keys(collector.transformers).length > 0
            ) {
              const nextResult = await runTransformerChain(
                collector,
                collector.transformers,
                nextChain,
                processedEvent!,
                destIngest,
                destRespond,
                `destination.${id}.next`,
              );
              if (nextResult.respond) destRespond = nextResult.respond;
            }
          }

          return event;
        }),
      );

      return {
        id,
        destination,
        error,
        response,
        totalDuration,
        batchedCount,
        allowedCount: allowedEvents.length,
        canonicalId,
        breakerConfig,
      };
    }),
  );

  // Build result objects
  const done: Record<string, Destination.Ref> = {};
  const queued: Record<string, Destination.Ref> = {};
  const failed: Record<string, Destination.Ref> = {};

  for (const result of results) {
    if (result.skipped) continue;

    const destination = result.destination;
    const ref: Destination.Ref = {
      type: destination.type || 'unknown',
      data: result.response, // Capture push() return value
    };

    // Ensure destination status entry exists
    ensureDestStatus(collector, result.id);
    const destStatus = collector.status.destinations[result.id];
    const now = Date.now();

    // Refresh point-in-time buffer sizes after the destination's push pass.
    destStatus.queuePushSize = destination.queuePush?.length ?? 0;
    destStatus.dlqSize = destination.dlq?.length ?? 0;

    // Circuit-breaker accounting keys on the canonical stepId so it matches the
    // gate exactly. Presence-gated: only when this destination has a breaker.
    const breakerConfig = result.breakerConfig;
    const breakerKey = result.canonicalId
      ? stepId('destination', result.canonicalId)
      : undefined;
    const recordBreaker = (outcome: 'transport-failure' | 'success') => {
      if (breakerConfig && breakerKey) {
        recordStepOutcome(
          collector.status.breakers,
          breakerKey,
          outcome,
          breakerConfig.threshold,
          breakerConfig.cooldown,
        );
      }
    };

    if (result.error) {
      ref.error = result.error;
      failed[result.id] = ref;
      destStatus.failed++;
      destStatus.lastAt = now;
      destStatus.duration += result.totalDuration || 0;
      collector.status.failed++;
      // A single-event push that threw/timed out is a transport failure.
      recordBreaker('transport-failure');
    } else if (result.queue && result.queue.length) {
      // Events already re-queued at destination.queuePush via skippedEvents push
      queued[result.id] = ref;
    } else {
      // If every allowed event was enqueued into a batch, success counters
      // belong to the flush callback (PROD-004 plan Q9): don't increment
      // here and don't mark `done`. The flush bumps `count` and `out` when
      // pushBatch resolves. If only some events were batched, count the
      // synchronously-delivered ones.
      const batchedCount = result.batchedCount ?? 0;
      const allowedCount = result.allowedCount ?? 0;
      const syncDelivered = Math.max(0, allowedCount - batchedCount);
      if (syncDelivered > 0 || allowedCount === 0) {
        done[result.id] = ref;
        // For non-batched destinations preserve the historical semantics
        // (one bump per pushToDestinations call, regardless of allowed
        // events count, since the original code only bumped once).
        destStatus.count++;
        destStatus.lastAt = now;
        destStatus.duration += result.totalDuration || 0;
        collector.status.out++;
        // A synchronously-delivered single-event push is a success: reset and
        // close the breaker. (Fully-batched passes settle in the flush
        // callback instead, which records its own outcome.)
        recordBreaker('success');
      }
    }
  }

  return createPushResult({
    event,
    ...(Object.keys(done).length && { done }),
    ...(Object.keys(queued).length && { queued }),
    ...(Object.keys(failed).length && { failed }),
  });
}

/**
 * Initializes a destination.
 *
 * @template Destination
 * @param collector - The walkerOS collector instance.
 * @param destination - The destination to initialize.
 * @param destId - The destination ID.
 * @returns Whether the destination was initialized successfully.
 */
/**
 * A destination declares a consent requirement when its config.consent has at
 * least one key. Such a destination must never be initialized without a cleared
 * consent gate (see destinationInit's `allowed` parameter).
 */
function hasConsentRequirement(destination: Destination.Instance): boolean {
  const required = destination.config.consent;
  return !!required && Object.keys(required).length > 0;
}

export async function destinationInit<Destination extends Destination.Instance>(
  collector: Collector.Instance,
  destination: Destination,
  destId: string,
  // Fail-closed consent gate. Callers MUST pass an affirmative allow decision
  // (per-event on the push path, collector-consent on the queueOn path). The
  // default is false so any future call site that forgets fails closed: a
  // consent-gated destination is never initialized without a cleared gate.
  allowed = false,
): Promise<boolean> {
  // Check if the destination was initialized properly or try to do so
  if (destination.init && !destination.config.init) {
    // Defense-in-depth: refuse to init a destination that declares a consent
    // requirement unless the gate was cleared. We do NOT re-derive consent from
    // collector state here, because the push path's decision may rest on an
    // event's individual consent this function cannot see; re-deriving would
    // wrongly block a legitimate event-level override.
    if (!allowed && hasConsentRequirement(destination)) {
      collector.logger
        .scope(destination.type || 'unknown')
        .debug('init blocked: consent gate not cleared');
      return false;
    }
    // Create scoped logger for this destination: [type:id] or [unknown:id]
    const destType = destination.type || 'unknown';
    const destLogger = collector.logger.scope(destType);

    const context: Destination.Context = {
      collector,
      logger: destLogger,
      id: destId,
      config: destination.config,
      env: mergeEnvironments(destination.env, destination.config.env),
      reportError: buildReportError(
        collector,
        'destination',
        destId,
        destLogger,
        destination,
      ),
    };

    destLogger.debug('init');

    const initStarted = Date.now();
    emitStep(
      collector,
      buildBaseState(collector, {
        stepId: stepId('destination', destId),
        stepType: 'destination',
        phase: 'init',
        eventId: '',
        now: initStarted,
      }),
    );

    let configResult;
    try {
      configResult = await useHooks(
        destination.init,
        'DestinationInit',
        collector.hooks,
        collector.logger,
      )(context);
    } catch (err) {
      const initErrFinished = Date.now();
      const errState = buildBaseState(collector, {
        stepId: stepId('destination', destId),
        stepType: 'destination',
        phase: 'error',
        eventId: '',
        now: initErrFinished,
      });
      errState.durationMs = initErrFinished - initStarted;
      errState.error =
        err instanceof Error
          ? { name: err.name, message: err.message }
          : { message: String(err) };
      emitStep(collector, errState);
      throw err;
    }

    // Actively check for errors (when false)
    if (configResult === false) return configResult; // don't push if init is false

    // Update the destination config if it was returned
    destination.config = {
      ...(configResult || destination.config),
      init: true, // Remember that the destination was initialized
    };

    // Flush queued on() events now that destination is initialized
    if (destination.queueOn?.length) {
      const queueOn = destination.queueOn;
      destination.queueOn = [];

      for (const { type, data } of queueOn) {
        callDestinationOn(collector, destination, destId, type, data);
      }
    }

    destLogger.debug('init done');
  }

  return true; // Destination is ready to push
}

/**
 * Pushes an event to a single destination.
 * Handles mapping, batching, and consent checks.
 *
 * @template Destination
 * @param collector - The walkerOS collector instance.
 * @param destination - The destination to push to.
 * @param destId - The destination ID.
 * @param event - The event to push.
 * @param ingest - Mutable ingest context flowing through the pipeline.
 * @returns Whether the event was pushed successfully.
 */
export async function destinationPush<Destination extends Destination.Instance>(
  collector: Collector.Instance,
  destination: Destination,
  destId: string,
  event: WalkerOS.Event,
  ingest?: Ingest,
  respond?: import('@walkeros/core').RespondFn,
): Promise<unknown> {
  const { config } = destination;

  const processed = await processEventMapping(event, config, collector);

  if (processed.ignore) return false;

  // Create scoped logger for this destination: [type] or [unknown]
  const destType = destination.type || 'unknown';
  const destLogger = collector.logger.scope(destType);

  const context: Destination.PushContext = {
    collector,
    logger: destLogger,
    id: destId,
    config,
    data: processed.data,
    rule: processed.mapping,
    ingest: ingest!,
    env: {
      ...mergeEnvironments(destination.env, config.env),
      ...(respond ? { respond } : {}),
    },
    reportError: buildReportError(
      collector,
      'destination',
      destId,
      destLogger,
      destination,
    ),
  };

  // Mock interception — replaces the actual destination.push() call
  if (config.mock !== undefined) {
    destLogger.debug('mock', { event: processed.event.name });
    return config.mock;
  }

  const eventMapping = processed.mapping;
  // Presence, not truthiness: batch: 0 is a valid 0 ms wait, not "disabled".
  const ruleHasBatch = eventMapping?.batch !== undefined;
  const mappingKey = ruleHasBatch
    ? processed.mappingKey || '* *'
    : BATCH_ALL_KEY;

  if (
    (ruleHasBatch || config.batch !== undefined) &&
    destination.pushBatch &&
    config.mock === undefined
  ) {
    // Initialize batch registry on destination (not on shared mapping config)
    destination.batches = destination.batches || {};

    // Get or create batch state for this mapping key
    if (!destination.batches[mappingKey]) {
      const batched: Destination.Batch<unknown> = {
        key: mappingKey,
        entries: [],
        events: [],
        data: [],
      };

      // Resolve scheduling options: mapping-level overrides destination-level.
      // Mapping rule `batch` (number form = wait; object = wait/size/age).
      // Destination config `batch` (number = wait; object = wait/size/age).
      const ruleOpts = normalizeBatchOptions(eventMapping?.batch);
      const destOpts = normalizeBatchOptions(config.batch);
      const wait =
        ruleOpts.wait ??
        destOpts.wait ??
        // No wait at either layer means "rely on size/age only"; pick a
        // long debounce so wait is effectively never the trigger.
        DEFAULT_BATCH_AGE;
      const size = ruleOpts.size ?? destOpts.size ?? DEFAULT_BATCH_SIZE;
      const age = ruleOpts.age ?? destOpts.age ?? DEFAULT_BATCH_AGE;

      // Capture references the flush closure needs. ingest, respond, and
      // per-event eventMapping are read from `entries`, NOT from this scope,
      // so the closure does NOT leak the first event's context.
      const baseEnv = mergeEnvironments(destination.env, config.env);

      const flushBatch = async (): Promise<void> => {
        const batchState = destination.batches![mappingKey];
        const currentBatched = batchState.batched;
        if (currentBatched.entries.length === 0) return;

        const snapshot: Destination.Batch<unknown> = {
          key: currentBatched.key,
          entries: currentBatched.entries,
          events: currentBatched.events,
          data: currentBatched.data,
        };
        currentBatched.entries = [];
        currentBatched.events = [];
        currentBatched.data = [];

        const rep = snapshot.entries[0];
        // Representative journey correlation for the batch record. A forwarded
        // batch may aggregate events from distinct upstream traces, so
        // first-entry stamping on the flush/error records is best-effort; the
        // per-event in/out records carry each event's exact trace.
        const {
          traceId: batchTraceId,
          sourceId: batchSourceId,
          parentEventId: batchParentEventId,
        } = journeyFields(rep.event, rep.ingest, collector);
        const batchContext: Destination.PushBatchContext = {
          collector,
          logger: destLogger,
          id: destId,
          config,
          data: undefined,
          rule: batchState.isDefault ? undefined : rep.rule,
          ingest: rep.ingest!,
          env: {
            ...baseEnv,
            ...(rep.respond ? { respond: rep.respond } : {}),
          },
          reportError: buildReportError(
            collector,
            'destination',
            destId,
            destLogger,
            destination,
          ),
        };

        destLogger.debug('push batch', { events: snapshot.entries.length });

        const destIdResolved = destination.config.id || destId;
        const destStatus = ensureDestStatus(collector, destIdResolved);

        // Circuit-breaker accounting for the batch path. Keys on the canonical
        // stepId so it matches the gate. Presence-gated. A whole-batch throw is
        // a transport failure; any delivered rows (full or partial success) are
        // a success. Partial-failure rows themselves are breaker-neutral.
        const flushBreakerConfig = resolveBreakerConfig(
          destination.config.breaker,
        );
        const flushBreakerKey = stepId('destination', destIdResolved);
        const recordFlushBreaker = (
          outcome: 'transport-failure' | 'success',
        ) => {
          if (flushBreakerConfig) {
            recordStepOutcome(
              collector.status.breakers,
              flushBreakerKey,
              outcome,
              flushBreakerConfig.threshold,
              flushBreakerConfig.cooldown,
            );
          }
        };

        const flushStarted = Date.now();
        const flushState = buildBaseState(collector, {
          stepId: stepId('destination', destId),
          stepType: 'destination',
          phase: 'flush',
          eventId: '',
          now: flushStarted,
          traceId: batchTraceId,
          sourceId: batchSourceId,
          parentEventId: batchParentEventId,
        });
        flushState.batch = { size: snapshot.entries.length, index: 0 };
        emitStep(collector, flushState);

        // Routes a set of [event, error] pairs to this destination's DLQ,
        // applying the bound and emitting the overflow warning once. Shared by
        // the whole-batch failure path (pushBatch threw) and the partial-row
        // failure path (pushBatch returned a BatchOutcome).
        const routeToDlq = (failures: Array<[WalkerOS.Event, unknown]>) => {
          const dlq = (destination.dlq = destination.dlq || []);
          const dlqBound = {
            max: destination.config.dlqMax ?? DEFAULT_DLQ_MAX,
          };
          let totalDropped = 0;
          for (const pair of failures) {
            const r = pushBounded(dlq, pair, dlqBound);
            totalDropped += r.dropped;
          }
          if (totalDropped > 0) {
            const droppedCount = bumpDropped(
              collector.status,
              stepId('destination', destIdResolved),
              'dlq',
              totalDropped,
            );
            warnOverflowOnce(
              dlq,
              destLogger,
              'destination.dlq overflow; oldest entries dropped',
              {
                buffer: 'dlq',
                destination: destIdResolved,
                cap: dlqBound.max,
                droppedCount,
              },
            );
          } else if (dlq.length < dlqBound.max) {
            resetOverflowFlag(dlq);
          }
          destStatus.failed += failures.length;
          destStatus.dlqSize = dlq.length;
          collector.status.failed += failures.length;
        };

        // Number of entries treated as delivered after the flush settles.
        // Whole-batch success (void) = all; whole-batch failure (throw) = 0;
        // partial outcome = total minus the entries reported failed.
        let succeededCount = snapshot.entries.length;

        const batchTimeoutMs = resolveDestinationTimeout(config.timeout);
        const outcome = await tryCatchAsync(
          (
            batchArg: Destination.Batch<unknown>,
            ctxArg: Destination.PushBatchContext,
          ) =>
            withTimeout(
              Promise.resolve(
                useHooks(
                  destination.pushBatch!,
                  'DestinationPushBatch',
                  collector.hooks,
                  collector.logger,
                )(batchArg, ctxArg),
              ),
              batchTimeoutMs,
              `Destination "${destId}" batch delivery timed out after ${batchTimeoutMs}ms`,
            ),
          (err) => {
            succeededCount = 0;
            const errFinished = Date.now();
            const batchErrState = buildBaseState(collector, {
              stepId: stepId('destination', destId),
              stepType: 'destination',
              phase: 'error',
              eventId: '',
              now: errFinished,
              traceId: batchTraceId,
              sourceId: batchSourceId,
              parentEventId: batchParentEventId,
            });
            batchErrState.durationMs = errFinished - flushStarted;
            batchErrState.error =
              err instanceof Error
                ? { name: err.name, message: err.message }
                : { message: String(err) };
            batchErrState.batch = {
              size: snapshot.entries.length,
              index: 0,
            };
            emitStep(collector, batchErrState);
            // Route the entire batch to DLQ on a thrown/whole-batch failure.
            routeToDlq(snapshot.entries.map((entry) => [entry.event, err]));
            // Whole-batch throw is a transport failure for the breaker.
            recordFlushBreaker('transport-failure');
            destLogger.error('Push batch failed', {
              error: err instanceof Error ? err.message : String(err),
              entries: snapshot.entries.length,
            });
            return undefined;
          },
        )(snapshot, batchContext);

        // Partial-failure path: pushBatch resolved a BatchOutcome listing the
        // entries that did not succeed. DLQ and fail-count only those; the rest
        // are delivered. Out-of-range indices are ignored defensively.
        if (isBatchOutcome(outcome) && outcome.failed.length > 0) {
          const failedPairs: Array<[WalkerOS.Event, unknown]> = [];
          const seen = new Set<number>();
          for (const failure of outcome.failed) {
            const entry = snapshot.entries[failure.index];
            if (!entry || seen.has(failure.index)) continue;
            seen.add(failure.index);
            failedPairs.push([
              entry.event,
              failure.error ??
                new Error(
                  `Push batch entry ${failure.index} failed (no per-row error provided)`,
                ),
            ]);
          }
          if (failedPairs.length > 0) {
            routeToDlq(failedPairs);
            succeededCount = Math.max(
              0,
              snapshot.entries.length - failedPairs.length,
            );
            destLogger.error('Push batch partial failure', {
              failed: failedPairs.length,
              delivered: succeededCount,
              entries: snapshot.entries.length,
            });
          }
        }

        destLogger.debug('push batch done');

        // Decrement in-flight regardless of outcome.
        destStatus.inFlightBatch = Math.max(
          0,
          (destStatus.inFlightBatch ?? 0) - snapshot.entries.length,
        );

        if (succeededCount > 0) {
          destStatus.count += succeededCount;
          destStatus.lastAt = Date.now();
          collector.status.out += succeededCount;
          // Any delivered rows mean the transport worked: success closes the
          // breaker. Partial-failure rows are breaker-neutral (handled by the
          // absence of a transport-failure record for them above).
          recordFlushBreaker('success');
        }
      };

      const scheduler = debounce(flushBatch, {
        wait,
        size,
        age,
      });

      destination.batches[mappingKey] = {
        batched,
        isDefault: !ruleHasBatch, // created via config.batch, not a rule's own batch
        batchFn: () => {
          void scheduler();
        },
        flush: async () => {
          await scheduler.flush();
        },
      };
    }

    // Add per-event entry into the batch.
    const batchState = destination.batches[mappingKey];
    batchState.batched.entries.push({
      event: processed.event,
      ingest,
      respond,
      rule: eventMapping,
      data: processed.data,
    });
    batchState.batched.events.push(processed.event);
    if (isDefined(processed.data)) batchState.batched.data.push(processed.data);

    // Emit a per-event in/out pair at enqueue time so observers see every
    // event that entered the batch, not just the later flush frame. Enqueue is
    // synchronous, so there is no vendor call to time and no durationMs. The
    // terminal out record carries the batch coordinates the assembler reads to
    // confirm batched delivery: size is the queue length after this enqueue,
    // index is this entry's slot. The coordinates live on the out record only.
    const batchEventId =
      typeof processed.event.id === 'string' ? processed.event.id : '';
    const batchJourney = journeyFields(event, ingest, collector);
    const enqueuedAt = Date.now();
    const batchInState = buildBaseState(collector, {
      stepId: stepId('destination', destId),
      stepType: 'destination',
      phase: 'in',
      eventId: batchEventId,
      now: enqueuedAt,
      traceId: batchJourney.traceId,
      sourceId: batchJourney.sourceId,
      parentEventId: batchJourney.parentEventId,
    });
    if (processed.mappingKey) batchInState.mappingKey = processed.mappingKey;
    if (processed.event.consent) {
      batchInState.consent = { ...processed.event.consent };
    }
    batchInState.inEvent = processed.event;
    emitStep(collector, batchInState);

    const batchOutState = buildBaseState(collector, {
      stepId: stepId('destination', destId),
      stepType: 'destination',
      phase: 'out',
      eventId: batchEventId,
      now: enqueuedAt,
      traceId: batchJourney.traceId,
      sourceId: batchJourney.sourceId,
      parentEventId: batchJourney.parentEventId,
    });
    if (processed.mappingKey) batchOutState.mappingKey = processed.mappingKey;
    batchOutState.outEvent = processed.event;
    batchOutState.batch = {
      size: batchState.batched.entries.length,
      index: batchState.batched.entries.length - 1,
    };
    emitStep(collector, batchOutState);

    // In-flight bookkeeping for operational visibility.
    const destIdResolved = destination.config.id || destId;
    const destStatus = ensureDestStatus(collector, destIdResolved);
    destStatus.inFlightBatch = (destStatus.inFlightBatch ?? 0) + 1;

    // Trigger debounced batch (also handles size/age caps internally).
    batchState.batchFn();

    // Signal "enqueued to batch, not delivered" so the aggregation pass
    // in pushToDestinations skips the synchronous `count` increment.
    return BATCHED_RESULT;
  } else {
    destLogger.debug('push', { event: processed.event.name });

    // Trace-level vendor-call capture (presence-gated). Only when an
    // observeLevel supplier reports 'trace' AND this destination declares
    // observable callables do we wrap the merged env with recording proxies
    // for this push. wrapEnv deep-clones the env per push, so this must never
    // run on the default path; prod stays zero-cost beyond the guard check.
    let recordedCalls: Simulation.Call[] | undefined;
    if (
      collector.observeLevel?.() === 'trace' &&
      Array.isArray(destination.calls) &&
      destination.calls.length > 0
    ) {
      const wrapped = wrapEnv({
        ...context.env,
        simulation: destination.calls,
      });
      context.env = wrapped.wrappedEnv;
      recordedCalls = wrapped.calls;

      // Paths wrapEnv could not resolve here (e.g. a live-web global not yet
      // installed) travel to the resolution-point wrapper (web-core getEnv) as
      // a typed recorder. Both channels push onto the SAME calls array, so the
      // out-record attach + sanitize below covers wrapped and recorded calls
      // alike. getEnv strips this key before the destination sees the env.
      if (wrapped.unresolved.length > 0) {
        wrapped.wrappedEnv[OBSERVE_ENV_KEY] = {
          paths: wrapped.unresolved,
          record: (fn, args) =>
            wrapped.calls.push({ fn, args, ts: Date.now() }),
        } satisfies Destination.EnvObserve;
      }
    }

    // Emit a per-event observer pair around the destination.push call so
    // observers see the work this destination did for this event.
    const eventIdValue =
      typeof processed.event.id === 'string' ? processed.event.id : '';
    const { traceId, sourceId, parentEventId } = journeyFields(
      event,
      ingest,
      collector,
    );
    const pushStarted = Date.now();
    const inState = buildBaseState(collector, {
      stepId: stepId('destination', destId),
      stepType: 'destination',
      phase: 'in',
      eventId: eventIdValue,
      now: pushStarted,
      traceId,
      sourceId,
      parentEventId,
    });
    if (processed.mappingKey) inState.mappingKey = processed.mappingKey;
    if (processed.event.consent) {
      inState.consent = { ...processed.event.consent };
    }
    inState.inEvent = processed.event;
    emitStep(collector, inState);

    try {
      // It's time to go to the destination's side now. Race the push against a
      // per-destination timeout so a hung delivery becomes a thrown failure
      // that flows into the SAME catch -> tryCatchAsync onError -> DLQ path a
      // real throw uses. The race is per call, so it never affects siblings.
      const timeoutMs = resolveDestinationTimeout(config.timeout);
      const response = await withTimeout(
        Promise.resolve(
          useHooks(
            destination.push,
            'DestinationPush',
            collector.hooks,
            collector.logger,
          )(processed.event, context),
        ),
        timeoutMs,
        `Destination "${destId}" delivery timed out after ${timeoutMs}ms`,
      );

      const pushFinished = Date.now();
      const outState = buildBaseState(collector, {
        stepId: stepId('destination', destId),
        stepType: 'destination',
        phase: 'out',
        eventId: eventIdValue,
        now: pushFinished,
        traceId,
        sourceId,
        parentEventId,
      });
      outState.durationMs = pushFinished - pushStarted;
      outState.outEvent = processed.event;
      // Attach the vendor calls recorded during this push, sanitized to a
      // JSON-safe projection. Only when trace capture ran and something was
      // recorded.
      if (recordedCalls && recordedCalls.length > 0) {
        outState.calls = sanitizeCalls(recordedCalls);
      }
      if (isDefined(response)) {
        outState.meta = { ...outState.meta, response };
      }
      if (processed.mappingKey) outState.mappingKey = processed.mappingKey;
      emitStep(collector, outState);

      destLogger.debug('push done');

      return response;
    } catch (err) {
      const pushFinished = Date.now();
      const errState = buildBaseState(collector, {
        stepId: stepId('destination', destId),
        stepType: 'destination',
        phase: 'error',
        eventId: eventIdValue,
        now: pushFinished,
        traceId,
        sourceId,
        parentEventId,
      });
      errState.durationMs = pushFinished - pushStarted;
      errState.error =
        err instanceof Error
          ? { name: err.name, message: err.message }
          : { message: String(err) };
      if (processed.mappingKey) errState.mappingKey = processed.mappingKey;
      emitStep(collector, errState);
      throw err;
    }
  }
}

/**
 * Creates a standardized result object for push operations.
 *
 * @param partialResult - A partial result to merge with the default result.
 * @returns The push result.
 */
export function createPushResult(
  partialResult?: Partial<Elb.PushResult>,
): Elb.PushResult {
  return {
    ok: !partialResult?.failed,
    ...partialResult,
  };
}

/**
 * Register a single destination from its init definition.
 * Merges code config, user config, and chain config.
 * Used by initDestinations and activatePending.
 */
export function registerDestination(
  def: Destination.Init,
): Destination.Instance {
  const { code, config = {}, env = {}, cache, state } = def;
  const { config: configWithBefore } = extractChainProperty(def, 'before');
  const { config: configWithChains } = extractChainProperty(
    { ...def, config: configWithBefore },
    'next',
  );
  const mergedConfig = { ...code.config, ...config, ...configWithChains };
  // Merge definition-level cache into config for runtime access
  if (cache) mergedConfig.cache = cache;
  // Merge definition-level state into config; a config-level state wins.
  if (state !== undefined && mergedConfig.state === undefined)
    mergedConfig.state = state;
  const mergedEnv = mergeEnvironments(code.env, env);
  return { ...code, config: mergedConfig, env: mergedEnv };
}

/**
 * Initializes a map of destinations using ONLY the unified code/config/env pattern.
 * Does NOT call destination.init() - that happens later during push with proper consent checks.
 *
 * @param destinations - The destinations to initialize.
 * @param collector - The collector instance for destination init context.
 * @returns The initialized destinations.
 */
export async function initDestinations(
  collector: Collector.Instance,
  destinations: Destination.InitDestinations = {},
): Promise<Collector.Destinations> {
  const result: Collector.Destinations = {};

  for (const [id, def] of Object.entries(destinations)) {
    if (def.config?.require?.length) {
      collector.pending.destinations[id] = def;
      continue;
    }
    result[id] = registerDestination(def);
  }

  return result;
}

/**
 * Merges destination environment with config environment
 * Config env takes precedence over destination env for overrides
 */
export function mergeEnvironments(
  destinationEnv?: Destination.Env,
  configEnv?: Destination.Env,
): Destination.Env {
  // If neither environment exists, return empty object
  if (!destinationEnv && !configEnv) return {};

  // If only one exists, return it
  if (!configEnv) return destinationEnv!;
  if (!destinationEnv) return configEnv;

  // Both exist - merge objects with configEnv taking precedence
  if (isObject(destinationEnv) && isObject(configEnv)) {
    return { ...destinationEnv, ...configEnv };
  }

  // If they're not both objects, config env overrides destination env
  return configEnv;
}
