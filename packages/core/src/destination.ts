import type {
  Destination as WalkerOSDestination,
  Mapping,
  WalkerOS,
  Elb,
} from './types';
import { getId } from './getId';
import { setByPath } from './byPath';
import { getMappingEvent, getMappingValue } from './mapping';
import { getGrantedConsent } from './consent';
import { tryCatchAsync } from './tryCatch';
import { assign } from './assign';
import { useHooks } from './useHooks';
import { isDefined, isObject } from './is';
import { debounce } from './invocations';
import { clone } from './clone';
import { createEventOrCommand } from './handle';

export type HandleCommandFn<T extends WalkerOS.Collector> = (
  collector: T,
  action: string,
  data?: Elb.PushData,
  options?: Elb.PushOptions,
) => Promise<Elb.PushResult>;

export function createPush<T extends WalkerOS.Collector, F extends Elb.Fn>(
  collector: T,
  handleCommand: HandleCommandFn<T>,
  prepareEvent: Elb.Fn<WalkerOS.PartialEvent>,
): F {
  return useHooks(
    async (...args) => {
      return await tryCatchAsync(
        async (...args: Parameters<Elb.Arguments>): Promise<Elb.PushResult> => {
          const [nameOrEvent, pushData, options] = args;
          const partialEvent = prepareEvent(...args);

          const { event, command } = createEventOrCommand(
            collector,
            nameOrEvent,
            partialEvent,
          );

          const result = command
            ? await handleCommand(collector, command, pushData, options)
            : await pushToDestinations(collector, event);

          return result;
        },
        (error) => {
          // Call custom error handling
          if (collector.config.onError)
            collector.config.onError(error, collector);

          return createPushResult({ ok: false });
        },
      )(...args);
    },
    'Push',
    collector.hooks,
  ) as unknown as F;
}

export async function addDestination(
  collector: WalkerOS.Collector,
  data: WalkerOSDestination.Init,
  options?: WalkerOSDestination.Config,
) {
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

export async function destinationInit<
  Destination extends WalkerOSDestination.Destination,
>(collector: WalkerOS.Collector, destination: Destination): Promise<boolean> {
  // Check if the destination was initialized properly or try to do so
  if (destination.init && !destination.config.init) {
    const configResult = await useHooks(
      destination.init,
      'DestinationInit',
      collector.hooks,
    )(destination.config, collector);

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

  const options = { data, collector };

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
        useHooks(
          destination.pushBatch!,
          'DestinationPushBatch',
          collector.hooks,
        )(batched, config, options);

        // Reset the batched queues
        batched.events = [];
        batched.data = [];
      }, eventMapping.batch);

    eventMapping.batched = batched;
    eventMapping.batchFn(destination, collector);
  } else {
    // It's time to go to the destination's side now
    await useHooks(destination.push, 'DestinationPush', collector.hooks)(
      event,
      config,
      eventMapping,
      options,
    );
  }

  return true;
}

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
