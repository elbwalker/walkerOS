import type { WalkerOS } from '@elbwalker/types';
import type { NodeClient, NodeDestination } from '../types';
import {
  debounce,
  getEventConfig,
  getId,
  isSameType,
  useHooks,
} from '@elbwalker/utils';
import { pushToDestinations } from './push';

export async function addDestination(
  instance: NodeClient.Instance,
  data: unknown = {},
  options: unknown = {},
) {
  if (!isSameType(data, {} as NodeDestination.Destination)) return;
  if (!isSameType(options, {} as NodeDestination.Config)) return;

  // Prefer explicit given config over default config
  const config = options || data.config || { init: false };

  const destination: NodeDestination.Destination = {
    init: data.init,
    push: data.push,
    config,
    type: data.type,
  };

  let id = config.id; // Use given id
  if (!id) {
    // Generate a new id if none was given
    do {
      id = getId(4);
    } while (instance.destinations[id]);
  }

  instance.destinations[id] = destination;

  // Process previous events if not disabled
  if (config.queue !== false) destination.queue = [...instance.queue];
  return await pushToDestinations(instance, undefined, { [id]: destination });
}

export async function destinationInit(
  instance: NodeClient.Instance,
  destination: NodeDestination.Destination,
) {
  // Check if the destination was initialized properly or try to do so
  if (destination.init && !destination.config.init) {
    const config = await destination.init(destination.config, instance);

    // Actively check for errors (when false)
    if (config === false) return config; // don't push if init is false

    // Update the destination config if it was returned
    if (config) destination.config = config;

    // Remember that the destination was initialized
    destination.config.init = true;
  }

  return true; // Destination is ready to push
}

export async function destinationPush(
  instance: NodeClient.Instance,
  destination: NodeDestination.Destination,
  event: WalkerOS.Event,
): Promise<boolean> {
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

  if (eventConfig?.batch && destination.pushBatch) {
    const batched = eventConfig.batched || {
      key: mappingKey,
      events: [],
    };
    batched.events.push(event);

    eventConfig.batchFn =
      eventConfig.batchFn ||
      debounce(async (destination, instance) => {
        useHooks(
          destination.pushBatch!,
          'DestinationPushBatch',
          instance.hooks,
        )(batched, destination.config, instance);

        // Reset the batched events queue
        // pushBatch isn't async yet, may cause trouble
        batched.events = [];
      }, eventConfig.batch);

    eventConfig.batched = batched;
    eventConfig.batchFn(destination, instance);
  } else {
    // It's time to go to the destination's side now
    await useHooks(destination.push, 'DestinationPush', instance.hooks)(
      event,
      destination.config,
      eventConfig,
      instance,
    );
  }

  return true;
}
