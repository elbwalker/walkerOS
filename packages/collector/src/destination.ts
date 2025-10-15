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
import { createEvent } from './handle';

/**
 * Creates the push function for the collector.
 * Handles events only (commands go through collector.command).
 *
 * @param collector - The walkerOS collector instance
 * @param prepareEvent - Function to enrich partial events
 * @returns The push function
 */
export function createPush<T extends Collector.Instance>(
  collector: T,
  prepareEvent: (event: WalkerOS.DeepPartialEvent) => WalkerOS.PartialEvent,
): Collector.PushFn {
  return useHooks(
    async (
      event: WalkerOS.DeepPartialEvent,
      context: Collector.PushContext = {},
    ): Promise<Elb.PushResult> => {
      return await tryCatchAsync(
        async (): Promise<Elb.PushResult> => {
          let partialEvent = event;

          // Apply source mapping if provided in context
          if (context.mapping) {
            const processed = await processEventMapping(
              partialEvent,
              context.mapping,
              collector,
            );

            // Check ignore flag
            if (processed.ignore) {
              return createPushResult({ ok: true });
            }

            // Check consent requirements
            if (context.mapping.consent) {
              const grantedConsent = getGrantedConsent(
                context.mapping.consent,
                collector.consent,
                processed.event.consent as WalkerOS.Consent | undefined,
              );

              if (!grantedConsent) {
                return createPushResult({ ok: true });
              }
            }

            partialEvent = processed.event;
          }

          // Prepare event (add timing, source info)
          const enrichedEvent = prepareEvent(partialEvent);

          // Create full event
          const fullEvent = createEvent(collector, enrichedEvent);

          // Push to destinations
          return await pushToDestinations(collector, fullEvent);
        },
        () => {
          return createPushResult({ ok: false });
        },
      )();
    },
    'Push',
    collector.hooks,
  ) as Collector.PushFn;
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
    destination.queue = [...collector.queue];

  return pushToDestinations(collector, undefined, { [id]: destination });
}

/**
 * Pushes an event to all or a subset of destinations.
 *
 * @param collector - The walkerOS collector instance.
 * @param event - The event to push.
 * @param destinations - The destinations to push to.
 * @returns The result of the push operation.
 */
export async function pushToDestinations(
  collector: Collector.Instance,
  event?: WalkerOS.Event,
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
      );

      if (!isInitialized) return { id, destination, queue: currentQueue };

      // Process the destinations event queue
      let error = false;
      if (!destination.dlq) destination.dlq = [];

      // Process allowed events and store failed ones in the dead letter queue (DLQ)
      await Promise.all(
        allowedEvents.map(async (event) => {
          // Merge event with collector state, prioritizing event properties
          event.globals = assign(globals, event.globals);
          event.user = assign(user, event.user);

          await tryCatchAsync(destinationPush, (err) => {
            // Call custom error handling if available
            if (collector.config.onError)
              collector.config.onError(err, collector);
            error = true; // oh no

            // Add failed event to destinations DLQ
            destination.dlq!.push([event, err]);

            return false;
          })(collector, destination, event);

          return event;
        }),
      );

      return { id, destination, error };
    }),
  );

  const successful = [];
  const queued = [];
  const failed = [];

  for (const result of results) {
    if (result.skipped) continue;

    const destination = result.destination;

    const ref = { id: result.id, destination };

    if (result.error) {
      failed.push(ref);
    } else if (result.queue && result.queue.length) {
      // Merge queue with existing queue
      destination.queue = (destination.queue || []).concat(result.queue);
      queued.push(ref);
    } else {
      successful.push(ref);
    }
  }

  return createPushResult({
    ok: !failed.length,
    event,
    successful,
    queued,
    failed,
  });
}

/**
 * Initializes a destination.
 *
 * @template Destination
 * @param collector - The walkerOS collector instance.
 * @param destination - The destination to initialize.
 * @returns Whether the destination was initialized successfully.
 */
export async function destinationInit<Destination extends Destination.Instance>(
  collector: Collector.Instance,
  destination: Destination,
): Promise<boolean> {
  // Check if the destination was initialized properly or try to do so
  if (destination.init && !destination.config.init) {
    const context: Destination.Context = {
      collector,
      config: destination.config,
      env: mergeEnvironments(destination.env, destination.config.env),
    };

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
 * @param event - The event to push.
 * @returns Whether the event was pushed successfully.
 */
export async function destinationPush<Destination extends Destination.Instance>(
  collector: Collector.Instance,
  destination: Destination,
  event: WalkerOS.Event,
): Promise<boolean> {
  const { config } = destination;

  const processed = await processEventMapping(event, config, collector);

  if (processed.ignore) return false;

  const context: Destination.PushContext = {
    collector,
    config,
    data: processed.data,
    mapping: processed.mapping,
    env: mergeEnvironments(destination.env, config.env),
  };

  const eventMapping = processed.mapping;
  if (eventMapping?.batch && destination.pushBatch) {
    const batched = eventMapping.batched || {
      key: processed.mappingKey || '',
      events: [],
      data: [],
    };
    batched.events.push(processed.event);
    if (isDefined(processed.data)) batched.data.push(processed.data);

    eventMapping.batchFn =
      eventMapping.batchFn ||
      debounce((destination, collector) => {
        const batchContext: Destination.PushBatchContext = {
          collector,
          config,
          data: processed.data,
          mapping: eventMapping,
          env: mergeEnvironments(destination.env, config.env),
        };

        useHooks(
          destination.pushBatch!,
          'DestinationPushBatch',
          (collector as Collector.Instance).hooks,
        )(batched, batchContext);

        batched.events = [];
        batched.data = [];
      }, eventMapping.batch);

    eventMapping.batched = batched;
    eventMapping.batchFn?.(destination, collector);
  } else {
    // It's time to go to the destination's side now
    await useHooks(
      destination.push,
      'DestinationPush',
      collector.hooks,
    )(processed.event, context);
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
  return assign(
    {
      ok: !partialResult?.failed?.length,
      successful: [],
      queued: [],
      failed: [],
    },
    partialResult,
  );
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

    // Merge config: destination default + provided config
    const mergedConfig = {
      ...code.config,
      ...config,
    };

    // Merge environment: destination default + provided env
    const mergedEnv = mergeEnvironments(code.env, env);

    // Create destination instance by spreading code and overriding config/env
    result[name] = {
      ...code,
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
function mergeEnvironments(
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
