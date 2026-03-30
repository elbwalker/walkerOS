import type {
  Collector,
  WalkerOS,
  Elb,
  Destination,
  Transformer,
  CompiledNext,
  Ingest,
} from '@walkeros/core';
import {
  assign,
  buildCacheContext,
  clone,
  compileCache,
  checkCache,
  storeCache,
  compileNext,
  createIngest,
  debounce,
  getId,
  getGrantedConsent,
  isDefined,
  isFunction,
  isObject,
  isRouteArray,
  processEventMapping,
  resolveNext,
  tryCatchAsync,
  useHooks,
} from '@walkeros/core';
import { callDestinationOn } from './on';
import {
  runTransformerChain,
  walkChain,
  extractTransformerNextMap,
  extractChainProperty,
} from './transformer';
import { getCacheStore } from './cache';

/**
 * Resolves transformer chain for a destination.
 * For conditional routing (NextRule[]), compiledBefore must be provided (compiled at init).
 * For static routing (string | string[]), resolution is direct.
 */
function resolveDestinationChain(
  before: Transformer.Next | undefined,
  compiledBefore: CompiledNext | undefined,
  transformers: Transformer.Transformers,
  ingest?: Ingest,
): string[] {
  if (!before) return [];

  if (compiledBefore) {
    const resolved = resolveNext(compiledBefore, buildCacheContext(ingest));
    if (!resolved) return [];
    return walkChain(resolved, extractTransformerNextMap(transformers));
  }

  return walkChain(
    before as string | string[],
    extractTransformerNextMap(transformers),
  );
}

/**
 * Adds a new destination to the collector.
 *
 * @param collector - The walkerOS collector instance.
 * @param data - The destination's init data.
 * @param options - The destination's config.
 * @returns The result of the push operation.
 */
export async function addDestination(
  collector: Collector.Instance,
  data: Destination.Init,
  options?: Destination.Config,
): Promise<Elb.PushResult> {
  const { code, config: dataConfig = {}, env = {}, before, next, cache } = data;

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

  const baseConfig = options || dataConfig || { init: false };
  // Merge before, next, and cache into config if provided at root level
  let config = before ? { ...baseConfig, before } : { ...baseConfig };
  if (next) config = { ...config, next };
  if (cache) config = { ...config, cache };

  const destination: Destination.Instance = {
    ...code,
    config,
    env: mergeEnvironments(code.env, env),
  };

  let id = destination.config.id; // Use given id
  if (!id) {
    // Generate a new id if none was given
    do {
      id = getId(4);
    } while (collector.destinations[id]);
  }

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

  // Add event to the collector queue
  if (event) {
    collector.queue.push(event);
    collector.status.in++;
  }

  // Use given destinations or use internal destinations
  if (!destinations) destinations = collector.destinations;

  const results = await Promise.all(
    // Process all destinations in parallel
    Object.entries(destinations || {}).map(async ([id, destination]) => {
      // Disabled destinations are completely skipped — no queuing, no init, no processing
      if (destination.config.disabled) {
        return { id, destination, skipped: true };
      }

      // Create a queue of events to be processed
      let currentQueue = (destination.queuePush || []).map((event) => ({
        ...event,
        consent,
      }));

      // Reset original queue while processing to enable async processing
      destination.queuePush = [];

      // Clone ingest for this destination (prevents cross-destination races in Promise.all)
      const destIngest: Ingest = meta.ingest
        ? {
            ...meta.ingest,
            _meta: { ...meta.ingest._meta, path: [...meta.ingest._meta.path] },
          }
        : createIngest('unknown');

      // Add event to queue stack
      if (event) {
        // Clone the event to avoid mutating the original event
        const currentEvent = clone(event);

        // Note: Policy is now applied in processEventMapping() within destinationPush()

        // Add event to queue stack
        currentQueue.push(currentEvent);
      }

      // If no events and no queued on events, skip this destination
      if (!currentQueue.length && !destination.queueOn?.length) {
        return { id, destination, skipped: true };
      }

      // If only on events queued (no push events), still init to flush queueOn
      if (!currentQueue.length && destination.queueOn?.length) {
        const isInitialized = await tryCatchAsync(destinationInit)(
          collector,
          destination,
          id,
        );
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

        return true; // Keep denied events in the queue
      });

      // Add skipped events back to the queue
      destination.queuePush.push(...skippedEvents);

      // Execution shall not pass if no events are allowed
      if (!allowedEvents.length) {
        return { id, destination, queue: currentQueue }; // Don't push if not allowed
      }

      // Initialize the destination if needed
      const isInitialized = await tryCatchAsync(destinationInit)(
        collector,
        destination,
        id,
      );

      if (!isInitialized) return { id, destination, queue: currentQueue };

      // Process the destinations event queue
      let error: unknown;
      let response: unknown;
      if (!destination.dlq) destination.dlq = [];

      // Compile before chain once per destination batch (not per-event)
      const before = destination.config.before;
      const compiledBefore =
        before && isRouteArray(before) ? compileNext(before) : undefined;
      const postChain = resolveDestinationChain(
        before,
        compiledBefore,
        collector.transformers,
        destIngest,
      );

      // Compile next chain once per destination batch (not per-event)
      const nextConfig = destination.config.next;
      const compiledNext =
        nextConfig && isRouteArray(nextConfig)
          ? compileNext(nextConfig)
          : undefined;

      // Compile destination cache once per batch (not per-event)
      const destCacheConfig = destination.config?.cache;
      const compiledDCache = destCacheConfig
        ? compileCache(destCacheConfig)
        : undefined;
      const dCacheStore = compiledDCache
        ? getCacheStore(compiledDCache, collector)
        : undefined;

      // Process allowed events and store failed ones in the dead letter queue (DLQ)
      let totalDuration = 0;
      await Promise.all(
        allowedEvents.map(async (event) => {
          // Merge event with collector state, prioritizing event properties
          event.globals = assign(globals, event.globals);
          event.user = assign(user, event.user);

          // Full cache check: before the before chain (skips everything on HIT)
          let cacheMiss: { key: string; ttl: number } | undefined;
          if (compiledDCache?.full && dCacheStore) {
            const cacheContext = buildCacheContext(destIngest, event);
            const cacheResult = checkCache(
              compiledDCache,
              dCacheStore,
              cacheContext,
              `d:${id}`,
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

            if (chainResult === null) {
              // Chain stopped - skip this event for this destination
              return event;
            }

            // Use the processed event (cast back to full Event type)
            // Before chains use first result if fan-out occurred
            processedEvent = (
              Array.isArray(chainResult) ? chainResult[0] : chainResult
            ) as WalkerOS.Event;
          }

          // Step-level cache check: after before chain, skip only push on HIT
          if (compiledDCache && !compiledDCache.full && dCacheStore) {
            const cacheContext = buildCacheContext(destIngest, processedEvent);
            const cacheResult = checkCache(
              compiledDCache,
              dCacheStore,
              cacheContext,
              `d:${id}`,
            );
            if (cacheResult?.status === 'HIT') {
              return event; // Skip push — deduplicated
            }
            if (cacheResult?.status === 'MISS') {
              cacheMiss = { key: cacheResult.key, ttl: cacheResult.rule.ttl };
            }
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

            // Add failed event to destinations DLQ
            destination.dlq!.push([processedEvent!, err]);

            return undefined;
          })(
            collector,
            destination,
            id,
            processedEvent!,
            destIngest,
            meta.respond,
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

          // Capture the last response (for single event pushes)
          if (result !== undefined) response = result;

          // Run destination.next chain after successful push
          if (!pushFailed && nextConfig) {
            // Write push response to ingest for destination.next transformers
            if (result !== undefined) {
              destIngest._response = result;
            }

            const nextChain = resolveDestinationChain(
              nextConfig,
              compiledNext,
              collector.transformers,
              destIngest,
            );

            if (
              nextChain.length > 0 &&
              collector.transformers &&
              Object.keys(collector.transformers).length > 0
            ) {
              await runTransformerChain(
                collector,
                collector.transformers,
                nextChain,
                processedEvent!,
                destIngest,
                meta.respond,
                `destination.${id}.next`,
              );
            }
          }

          return event;
        }),
      );

      return { id, destination, error, response, totalDuration };
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
    if (!collector.status.destinations[result.id]) {
      collector.status.destinations[result.id] = {
        count: 0,
        failed: 0,
        duration: 0,
      };
    }
    const destStatus = collector.status.destinations[result.id];
    const now = Date.now();

    if (result.error) {
      ref.error = result.error;
      failed[result.id] = ref;
      destStatus.failed++;
      destStatus.lastAt = now;
      destStatus.duration += result.totalDuration || 0;
      collector.status.failed++;
    } else if (result.queue && result.queue.length) {
      // Events already re-queued at destination.queuePush via skippedEvents push
      queued[result.id] = ref;
    } else {
      done[result.id] = ref;
      destStatus.count++;
      destStatus.lastAt = now;
      destStatus.duration += result.totalDuration || 0;
      collector.status.out++;
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
export async function destinationInit<Destination extends Destination.Instance>(
  collector: Collector.Instance,
  destination: Destination,
  destId: string,
): Promise<boolean> {
  // Check if the destination was initialized properly or try to do so
  if (destination.init && !destination.config.init) {
    // Create scoped logger for this destination: [type:id] or [unknown:id]
    const destType = destination.type || 'unknown';
    const destLogger = collector.logger.scope(destType);

    const context: Destination.Context = {
      collector,
      logger: destLogger,
      id: destId,
      config: destination.config,
      env: mergeEnvironments(destination.env, destination.config.env),
    };

    destLogger.debug('init');

    const configResult = await useHooks(
      destination.init,
      'DestinationInit',
      collector.hooks,
    )(context);

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
  };

  // Mock interception — replaces the actual destination.push() call
  if (config.mock !== undefined) {
    destLogger.debug('mock', { event: processed.event.name });
    return config.mock;
  }

  const eventMapping = processed.mapping;
  const mappingKey = processed.mappingKey || '* *';

  if (
    eventMapping?.batch &&
    destination.pushBatch &&
    config.mock === undefined
  ) {
    // Initialize batch registry on destination (not on shared mapping config)
    destination.batches = destination.batches || {};

    // Get or create batch state for this mapping key
    if (!destination.batches[mappingKey]) {
      const batched: Destination.Batch<unknown> = {
        key: mappingKey,
        events: [],
        data: [],
      };

      destination.batches[mappingKey] = {
        batched,
        batchFn: debounce(() => {
          const batchState = destination.batches![mappingKey];
          const currentBatched = batchState.batched;

          const batchContext: Destination.PushBatchContext = {
            collector,
            logger: destLogger,
            id: destId,
            config,
            // Note: batch.data contains all transformed data; context.data is for single events
            data: undefined,
            rule: eventMapping, // Renamed from mapping to rule
            ingest: ingest!, // Mutable shared context
            env: {
              ...mergeEnvironments(destination.env, config.env),
              ...(respond ? { respond } : {}),
            },
          };

          destLogger.debug('push batch', {
            events: currentBatched.events.length,
          });

          useHooks(
            destination.pushBatch!,
            'DestinationPushBatch',
            collector.hooks,
          )(currentBatched, batchContext);

          destLogger.debug('push batch done');

          // Reset batch
          currentBatched.events = [];
          currentBatched.data = [];
        }, eventMapping.batch),
      };
    }

    // Add event to batch
    const batchState = destination.batches[mappingKey];
    batchState.batched.events.push(processed.event);
    if (isDefined(processed.data)) batchState.batched.data.push(processed.data);

    // Trigger debounced batch
    batchState.batchFn();
  } else {
    destLogger.debug('push', { event: processed.event.name });

    // It's time to go to the destination's side now
    const response = await useHooks(
      destination.push,
      'DestinationPush',
      collector.hooks,
    )(processed.event, context);

    destLogger.debug('push done');

    return response;
  }

  return true;
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
  const { code, config = {}, env = {}, cache } = def;
  const { config: configWithBefore } = extractChainProperty(def, 'before');
  const { config: configWithChains } = extractChainProperty(
    { ...def, config: configWithBefore },
    'next',
  );
  const mergedConfig = { ...code.config, ...config, ...configWithChains };
  // Merge definition-level cache into config for runtime access
  if (cache) mergedConfig.cache = cache;
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
