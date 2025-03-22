import type {
  Destination as WalkerOSDestination,
  Mapping,
  WalkerOS,
  Elb,
} from '@elbwalker/types';
import { getId } from './getId';
import { setByPath } from './byPath';
import { getMappingEvent, getMappingValue } from './mapping';
import { getGrantedConsent } from './consent';
import { tryCatchAsync } from './tryCatch';
import { assign } from './assign';
import { useHooks } from './useHooks';
import { isDefined, isObject } from './is';
import { debounce } from './invocations';

export async function addDestination(
  instance: WalkerOS.Instance,
  data: WalkerOSDestination.DestinationInit,
  options?: WalkerOSDestination.Config,
) {
  // Prefer explicit given config over default config
  const config = options || data.config || { init: false };

  const destination: WalkerOSDestination.Destination = {
    ...data,
    config,
  };

  let id = config.id; // Use given id
  if (!id) {
    // Generate a new id if none was given
    do {
      id = getId(4);
    } while (instance.destinations[id]);
  }

  // Add the destination
  instance.destinations[id] = destination;

  // Process previous events if not disabled
  if (config.queue !== false) destination.queue = [...instance.queue];
  return pushToDestinations(instance, { destination });
}

export async function pushToDestinations(
  instance: WalkerOS.Instance,
  destinations: WalkerOS.Destinations,
  event?: WalkerOS.Event,
): Promise<Elb.PushResult> {
  const { consent, globals, user } = instance;
  const results: Array<{
    id: string;
    destination: WalkerOSDestination.Destination;
    skipped?: boolean;
    queue?: WalkerOS.Events;
    error?: unknown;
  }> = [];

  return Promise.all(
    // Process all destinations in parallel
    Object.entries(destinations).map(async ([id, destination]) => {
      // Setup queue of events to be processed
      let queue = ([] as WalkerOS.Events).concat(destination.queue || []);
      destination.queue = []; // Reset original queue while processing

      // Add event to queue stack
      if (event) {
        // Policy check
        await Promise.all(
          Object.entries(destination.config.policy || []).map(
            async ([key, mapping]) => {
              const value = await getMappingValue(event, mapping, { instance });
              setByPath(event, key, value);
            },
          ),
        );

        queue.push(event);
      }

      // Nothing to do here if the queue is empty
      if (!queue.length) return { id, destination, skipped: true };

      const allowedEvents: WalkerOS.Events = [];
      queue = queue.filter((queuedEvent) => {
        const grantedConsent = getGrantedConsent(
          destination.config.consent, // Required
          consent, // Destination state
          queuedEvent.consent, // Individual event state
        );

        if (grantedConsent) {
          queuedEvent.consent = grantedConsent; // Save granted consent states only
          allowedEvents.push(queuedEvent); // Add to allowed queue
          return false; // Remove from destination queue
        }

        return true; // Keep denied events in the queue
      });

      // Execution shall not pass if no events are allowed
      if (!allowedEvents.length) {
        return { id, destination, queue }; // Don't push if not allowed
      }

      // Initialize the destination if needed
      const isInitialized = await tryCatchAsync(destinationInit)(
        instance,
        destination,
      );
      if (!isInitialized) return { id, destination, queue };

      // Process the destinations event queue
      let error: unknown;

      // Process allowed events and store failed ones in the dead letter queue (dlq)
      const dlq = await Promise.all(
        allowedEvents.filter(async (event) => {
          if (error) {
            // Skip if an error occurred
            destination.queue?.push(event); // Add back to queue
          }

          // Merge event with instance state, prioritizing event properties
          event = assign({}, event);
          event.globals = assign(globals, event.globals);
          event.user = assign(user, event.user);

          return !(await tryCatchAsync(destinationPush, (err) => {
            // Call custom error handling if available
            if (instance.config.onError) instance.config.onError(err, instance);
            error = err; // Captured error from destination
          })(instance, destination, event));
        }),
      );

      // Concatenate failed events with unprocessed ones in the queue
      queue.concat(dlq);

      return { id, destination, queue, error };
    }),
  ).then((results) => {
    const successful: WalkerOSDestination.PushSuccess = [];
    const queued: WalkerOSDestination.PushSuccess = [];
    const failed: WalkerOSDestination.PushFailure = [];

    for (const result of results) {
      if (result.skipped) continue;

      const id = result.id;
      const destination = result.destination;

      if (result.error) {
        failed.push({
          id,
          destination,
          error: String(result.error),
        });
      } else if (result.queue && result.queue.length) {
        // Merge queue with existing queue
        destination.queue = (destination.queue || []).concat(result.queue);
        queued.push({ id, destination });
      } else {
        successful.push({ id, destination });
      }
    }

    return {
      status: { ok: true },
      successful,
      queued,
      failed,
    };
  });
}

export async function destinationInit<
  Destination extends WalkerOSDestination.Destination,
>(instance: WalkerOS.Instance, destination: Destination): Promise<boolean> {
  // Check if the destination was initialized properly or try to do so
  if (destination.init && !destination.config.init) {
    const configResult = await useHooks(
      destination.init,
      'DestinationInit',
      instance.hooks,
    )(destination.config, instance);

    // Actively check for errors (when false)
    if (configResult === false) return configResult; // don't push if init is false

    // Update the destination config if it was returned
    if (configResult) {
      destination.config = configResult;
    }

    // Remember that the destination was initialized
    destination.config.init = true;
  }

  return true; // Destination is ready to push
}

export async function destinationPush<
  Destination extends WalkerOSDestination.Destination,
>(
  instance: WalkerOS.Instance,
  destination: Destination,
  event: WalkerOS.Event,
): Promise<boolean> {
  const { config } = destination;
  const { eventMapping, mappingKey } = await getMappingEvent(
    event,
    config.mapping,
  );

  let data = await resolveMappingData(event, config.data);

  if (eventMapping) {
    // Check if event should be processed or ignored
    if (eventMapping.ignore) return false;

    // Check to use specific event names
    if (eventMapping.name) event.event = eventMapping.name;

    // Transform event to a custom data
    if (eventMapping.data) {
      const dataEvent = await resolveMappingData(event, eventMapping.data);
      data =
        isObject(data) && isObject(dataEvent) // Only merge objects
          ? assign(data, dataEvent)
          : dataEvent;
    }
  }

  const options = { data, instance };

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
      debounce((destination, instance) => {
        useHooks(
          destination.pushBatch!,
          'DestinationPushBatch',
          instance.hooks,
        )(batched, destination.config, options);

        // Reset the batched queues
        batched.events = [];
        batched.data = [];
      }, eventMapping.batch);

    eventMapping.batched = batched;
    eventMapping.batchFn(destination, instance);
  } else {
    // It's time to go to the destination's side now
    await useHooks(destination.push, 'DestinationPush', instance.hooks)(
      event,
      destination.config,
      eventMapping,
      options,
    );
  }

  return true;
}

async function resolveMappingData(
  event: WalkerOS.Event,
  data?: Mapping.Data,
): Promise<WalkerOSDestination.Data> {
  if (!data) return;

  return await getMappingValue(event, data);
}

export { resolveMappingData };
