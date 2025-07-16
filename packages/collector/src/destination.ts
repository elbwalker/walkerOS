import type {
  Destination as WalkerOSDestination,
  WalkerOS,
  Elb,
} from '@walkerOS/core';
import {
  assign,
  clone,
  createWrapper,
  debounce,
  getId,
  getGrantedConsent,
  getMappingEvent,
  getMappingValue,
  isDefined,
  isObject,
  setByPath,
  tryCatchAsync,
  useHooks,
} from '@walkerOS/core';
import { createEventOrCommand } from './handle';

export type HandleCommandFn<T extends WalkerOS.Collector> = (
  collector: T,
  action: string,
  data?: Elb.PushData,
  options?: unknown,
) => Promise<Elb.PushResult>;

/**
 * Creates the main push function for the collector.
 *
 * @template T, F
 * @param collector - The walkerOS collector instance.
 * @param handleCommand - TBD.
 * @param prepareEvent - TBD.
 * @returns The push function.
 */
export function createPush<T extends WalkerOS.Collector>(
  collector: T,
  handleCommand: HandleCommandFn<T>,
  prepareEvent: (event: WalkerOS.DeepPartialEvent) => WalkerOS.PartialEvent,
): Elb.Fn {
  return useHooks(
    async (
      eventOrCommand: unknown,
      data?: Elb.PushData,
      options?: unknown,
    ): Promise<Elb.PushResult> => {
      return await tryCatchAsync(
        async (): Promise<Elb.PushResult> => {
          // Handle simplified core collector interface
          if (
            typeof eventOrCommand === 'string' &&
            eventOrCommand.startsWith('walker ')
          ) {
            // Walker command format: 'walker action', data, options
            const command = eventOrCommand.replace('walker ', '');
            return await handleCommand(collector, command, data, options);
          } else {
            // Event format: event object or string
            const partialEvent =
              typeof eventOrCommand === 'string'
                ? { event: eventOrCommand }
                : (eventOrCommand as WalkerOS.DeepPartialEvent);

            const enrichedEvent = prepareEvent(partialEvent);

            const { event, command } = createEventOrCommand(
              collector,
              enrichedEvent.event,
              enrichedEvent,
            );

            const result = command
              ? await handleCommand(collector, command, data, options)
              : await pushToDestinations(collector, event);

            return result;
          }
        },
        () => {
          return createPushResult({ ok: false });
        },
      )();
    },
    'Push',
    collector.hooks,
  ) as Elb.Fn;
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
  collector: WalkerOS.Collector,
  data: WalkerOSDestination.Init,
  options?: WalkerOSDestination.Config,
): Promise<Elb.PushResult> {
  // Prefer explicit given config over default config
  const config = options || data.config || { init: false };
  // @TODO might not be the best solution to use options || data.config

  const destination: WalkerOSDestination.Destination = {
    ...data,
    config,
  };

  let id = config.id; // Use given id
  if (!id) {
    // Generate a new id if none was given
    do {
      id = getId(4);
    } while (collector.destinations[id]);
  }

  // Add the destination
  collector.destinations[id] = destination;

  // Process previous events if not disabled
  if (config.queue !== false) destination.queue = [...collector.queue];

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
  collector: WalkerOS.Collector,
  event?: WalkerOS.Event,
  destinations?: WalkerOS.Destinations,
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
    Object.entries(destinations).map(async ([id, destination]) => {
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
        let currentEvent = clone(event);

        // Policy check
        await Promise.all(
          Object.entries(destination.config.policy || []).map(
            async ([key, mapping]) => {
              const value = await getMappingValue(event, mapping, {
                collector,
              });
              currentEvent = setByPath(currentEvent, key, value);
            },
          ),
        );

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
export async function destinationInit<
  Destination extends WalkerOSDestination.Destination,
>(collector: WalkerOS.Collector, destination: Destination): Promise<boolean> {
  // Check if the destination was initialized properly or try to do so
  if (destination.init && !destination.config.init) {
    const context: WalkerOSDestination.Context = {
      collector,
      config: destination.config,
      wrap: getWrapper(destination, collector),
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
export async function destinationPush<
  Destination extends WalkerOSDestination.Destination,
>(
  collector: WalkerOS.Collector,
  destination: Destination,
  event: WalkerOS.Event,
): Promise<boolean> {
  const { config } = destination;
  const { eventMapping, mappingKey } = await getMappingEvent(
    event,
    config.mapping,
  );

  let data =
    config.data && (await getMappingValue(event, config.data, { collector }));

  if (eventMapping) {
    // Check if event should be processed or ignored
    if (eventMapping.ignore) return false;

    // Check to use specific event names
    if (eventMapping.name) event.event = eventMapping.name;

    // Transform event to a custom data
    if (eventMapping.data) {
      const dataEvent =
        eventMapping.data &&
        (await getMappingValue(event, eventMapping.data, { collector }));
      data =
        isObject(data) && isObject(dataEvent) // Only merge objects
          ? assign(data, dataEvent)
          : dataEvent;
    }
  }

  const context: WalkerOSDestination.PushContext = {
    collector,
    config,
    data,
    mapping: eventMapping,
    wrap: getWrapper(destination, collector),
  };

  if (eventMapping?.batch && destination.pushBatch) {
    const batched = eventMapping.batched || {
      key: mappingKey || '',
      events: [],
      data: [],
    };
    batched.events.push(event);
    if (isDefined(data)) batched.data.push(data);

    eventMapping.batchFn =
      eventMapping.batchFn ||
      debounce((destination, collector) => {
        const batchContext: WalkerOSDestination.PushBatchContext = {
          collector,
          config,
          data,
          mapping: eventMapping,
          wrap: getWrapper(destination, collector),
        };

        useHooks(
          destination.pushBatch!,
          'DestinationPushBatch',
          collector.hooks,
        )(batched, batchContext);

        // Reset the batched queues
        batched.events = [];
        batched.data = [];
      }, eventMapping.batch);

    eventMapping.batched = batched;
    eventMapping.batchFn(destination, collector);
  } else {
    // It's time to go to the destination's side now
    await useHooks(
      destination.push,
      'DestinationPush',
      collector.hooks,
    )(event, context);
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
 * Initializes a map of destinations.
 *
 * @param destinations - The destinations to initialize.
 * @returns The initialized destinations.
 */
export function initDestinations(
  destinations: WalkerOSDestination.InitDestinations,
): WalkerOSDestination.Destinations {
  return Object.entries(destinations).reduce<WalkerOSDestination.Destinations>(
    (acc, [name, destination]) => {
      acc[name] = {
        ...destination,
        config: isObject(destination.config) ? destination.config : {},
      };
      return acc;
    },
    {},
  );
}

function getWrapper(
  destination: WalkerOSDestination.Destination,
  collector?: WalkerOS.Collector,
) {
  const wrapperConfig = destination.config.wrapper || {};
  const dryRun = destination.config.dryRun ?? collector?.config.dryRun;

  return createWrapper(destination.type || 'unknown', {
    ...wrapperConfig,
    ...(isDefined(dryRun) && { dryRun }),
  });
}
