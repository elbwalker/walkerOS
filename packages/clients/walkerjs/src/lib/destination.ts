import type { WalkerOS } from '@elbwalker/types';
import type { WebClient, WebDestination } from '../types';
import {
  debounce,
  getEventConfig,
  getId,
  tryCatch,
  useHooks,
} from '@elbwalker/utils';
import { pushToDestinations } from './push';

export function addDestination(
  instance: WebClient.Instance,
  data: WebDestination.DestinationInit,
  options?: WebDestination.Config,
) {
  // Prefer explicit given config over default config
  const config = options || data.config || { init: false };

  const destination: WebDestination.Destination = {
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
  if (config.queue !== false) {
    destination.queue = ([] as WalkerOS.Events).concat(instance.queue); // Copy the queue
    pushToDestinations(instance, { destination });
  }
}

export function dataLayerDestination() {
  window.dataLayer = window.dataLayer || [];
  const dataLayerPush = (event: unknown) => {
    (window.dataLayer as unknown[]).push(event);
  };
  const destination: WebDestination.DestinationInit = {
    push: (event) => {
      dataLayerPush({
        ...event,
      });
    },
    pushBatch: (batch) => {
      dataLayerPush({
        event: 'batch',
        batched_event: batch.key,
        events: batch.events,
      });
    },
    type: 'dataLayer',
  };

  return destination;
}

export function destinationInit(
  instance: WebClient.Instance,
  destination: WebDestination.Destination,
) {
  // Check if the destination was initialized properly or try to do so
  if (destination.init && !destination.config.init) {
    const config = useHooks(
      destination.init,
      'DestinationInit',
      instance.hooks,
    )(destination.config, instance);

    // Actively check for errors (when false)
    if (config === false) return config; // don't push if init is false

    // Update the destination config if it was returned
    if (config) destination.config = config;

    // Remember that the destination was initialized
    destination.config.init = true;
  }

  return true; // Destination is ready to push
}

export function destinationPush(
  instance: WebClient.Instance,
  destination: WebDestination.Destination,
  event: WalkerOS.Event,
): boolean {
  const { eventConfig, mappingKey } = getEventConfig(
    event,
    destination.config.mapping,
  );

  if (eventConfig) {
    // Check if event should be processed or ignored
    if (eventConfig.ignore) return false;

    // Check to use specific event names
    if (eventConfig.name) event.event = eventConfig.name;
  }

  return !!tryCatch(() => {
    if (eventConfig?.batch && destination.pushBatch) {
      const batched = eventConfig.batched || {
        key: mappingKey,
        events: [],
      };
      batched.events.push(event);

      eventConfig.batchFn =
        eventConfig.batchFn ||
        debounce((destination, instance) => {
          useHooks(
            destination.pushBatch!,
            'DestinationPushBatch',
            instance.hooks,
          )(batched, destination.config, instance);

          // Reset the batched events queue
          batched.events = [];
        }, eventConfig.batch);

      eventConfig.batched = batched;
      eventConfig.batchFn(destination, instance);
    } else {
      // It's time to go to the destination's side now
      useHooks(destination.push, 'DestinationPush', instance.hooks)(
        event,
        destination.config,
        eventConfig,
        instance,
      );
    }

    return true;
  })();
}
