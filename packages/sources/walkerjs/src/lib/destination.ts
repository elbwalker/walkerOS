import type { Destination, WalkerOS } from '@elbwalker/types';
import type { SourceWalkerjs, DestinationWeb } from '../types';
import { getId, useHooks } from '@elbwalker/utils';
import { pushToDestinations } from './push';

export function addDestination(
  instance: SourceWalkerjs.Instance,
  data: DestinationWeb.DestinationInit,
  options?: DestinationWeb.Config,
) {
  // Prefer explicit given config over default config
  const config = options || data.config || { init: false };

  const destination: DestinationWeb.Destination = {
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
  const destination: DestinationWeb.DestinationInit = {
    push: (event, config, mapping, options = {}) => {
      // Do not process events from dataLayer source
      if (event.source?.type === 'dataLayer') return;

      const data = options.data || event;
      dataLayerPush(data);
    },
    pushBatch: (batch) => {
      dataLayerPush({
        event: 'batch',
        batched_event: batch.key,
        events: batch.data.length ? batch.data : batch.events,
      });
    },
    type: 'dataLayer',
  };

  return destination;
}

export function destinationInit(
  instance: SourceWalkerjs.Instance,
  destination: DestinationWeb.Destination,
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
