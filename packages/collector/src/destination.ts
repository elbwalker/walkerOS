import type { Collector, WalkerOS, Elb, Destination } from '@walkeros/core';
import {
  assign,
  clone,
  debounce,
  getId,
  getGrantedConsent,
  isDefined,
  isObject,
  processEventMapping,
  tryCatchAsync,
  useHooks,
} from '@walkeros/core';
import { destinationCode } from './destination-code';
import { runTransformerChain } from './transformer';

function resolveCode(code: Destination.Instance | true): Destination.Instance {
  return code === true ? destinationCode : code;
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
  const { code, config: dataConfig = {}, env = {} } = data;
  const config = options || dataConfig || { init: false };

  const resolved = resolveCode(code);
  const destination: Destination.Instance = {
    ...resolved,
    config,
    env: mergeEnvironments(resolved.env, env),
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
    destination.queue = [...collector.queue];

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
  meta: { id?: string; ingest?: unknown } = {},
  destinations?: Collector.Destinations,
): Promise<Elb.PushResult> {
  const { allowed, consent, globals, user } = collector;

  // Check if collector is allowed to push
  if (!allowed) return createPushResult({ ok: false });

  // Add event to the collector queue
  if (event) collector.queue.push(event);

  // Use given destinations or use internal destinations
  if (!destinations) destinations = collector.destinations;

  const results = await Promise.all(
    // Process all destinations in parallel
    Object.entries(destinations || {}).map(async ([id, destination]) => {
      // Create a queue of events to be processed
      let currentQueue = (destination.queue || []).map((event) => ({
        ...event,
        consent,
      }));

      // Reset original queue while processing to enable async processing
      destination.queue = [];

      // Add event to queue stack
      if (event) {
        // Clone the event to avoid mutating the original event
        const currentEvent = clone(event);

        // Note: Policy is now applied in processEventMapping() within destinationPush()

        // Add event to queue stack
        currentQueue.push(currentEvent);
      }

      // Nothing to do here if the queue is empty
      if (!currentQueue.length) return { id, destination, skipped: true };

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
      destination.queue.concat(skippedEvents);

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

      // Get post-collector transformer chain for this destination
      const postChain = collector.transformerChain?.post?.[id] || [];

      // Process allowed events and store failed ones in the dead letter queue (DLQ)
      await Promise.all(
        allowedEvents.map(async (event) => {
          // Merge event with collector state, prioritizing event properties
          event.globals = assign(globals, event.globals);
          event.user = assign(user, event.user);

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
              meta.ingest,
            );

            if (chainResult === null) {
              // Chain stopped - skip this event for this destination
              return event;
            }

            // Use the processed event (cast back to full Event type)
            processedEvent = chainResult as WalkerOS.Event;
          }

          const result = await tryCatchAsync(destinationPush, (err) => {
            // Log the error with destination scope
            const destType = destination.type || 'unknown';
            collector.logger.scope(destType).error('Push failed', {
              error: err,
              event: processedEvent!.name,
            });
            error = err; // oh no

            // Add failed event to destinations DLQ
            destination.dlq!.push([processedEvent!, err]);

            return undefined;
          })(collector, destination, id, processedEvent!, meta.ingest);

          // Capture the last response (for single event pushes)
          if (result !== undefined) response = result;

          return event;
        }),
      );

      return { id, destination, error, response };
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

    if (result.error) {
      ref.error = result.error;
      failed[result.id] = ref;
    } else if (result.queue && result.queue.length) {
      destination.queue = (destination.queue || []).concat(result.queue);
      queued[result.id] = ref;
    } else {
      done[result.id] = ref;
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
 * @param ingest - Optional ingest metadata (frozen, same reference).
 * @returns Whether the event was pushed successfully.
 */
export async function destinationPush<Destination extends Destination.Instance>(
  collector: Collector.Instance,
  destination: Destination,
  destId: string,
  event: WalkerOS.Event,
  ingest?: unknown,
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
    ingest,
    env: mergeEnvironments(destination.env, config.env),
  };

  const eventMapping = processed.mapping;
  const mappingKey = processed.mappingKey || '* *';

  if (eventMapping?.batch && destination.pushBatch) {
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
            ingest, // Same frozen reference
            env: mergeEnvironments(destination.env, config.env),
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
 * Initializes a map of destinations using ONLY the unified code/config/env pattern.
 * Does NOT call destination.init() - that happens later during push with proper consent checks.
 *
 * @param destinations - The destinations to initialize.
 * @param collector - The collector instance for destination init context.
 * @returns The initialized destinations.
 */
export async function initDestinations(
  _collector: Collector.Instance,
  destinations: Destination.InitDestinations = {},
): Promise<Collector.Destinations> {
  const result: Collector.Destinations = {};

  for (const [name, destinationDef] of Object.entries(destinations)) {
    const { code, config = {}, env = {} } = destinationDef;
    const resolved = resolveCode(code);

    const mergedConfig = {
      ...resolved.config,
      ...config,
    };

    const mergedEnv = mergeEnvironments(resolved.env, env);

    result[name] = {
      ...resolved,
      config: mergedConfig,
      env: mergedEnv,
    };
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
