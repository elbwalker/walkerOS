import type { Destination, WalkerOS } from '@elbwalker/types';
import type { SourceNode, DestinationNode } from '../types';
import {
  debounce,
  getMappingEvent,
  getId,
  isSameType,
  useHooks,
  getMappingValue,
  isDefined,
} from '@elbwalker/utils';
import { pushToDestinations } from './push';

export async function addDestination(
  instance: SourceNode.Instance,
  data: unknown = {},
  options: unknown = {},
) {
  if (!isSameType(data, {} as DestinationNode.Destination)) return;
  if (!isSameType(options, {} as DestinationNode.Config)) return;

  // Prefer explicit given config over default config
  const config = options || data.config || { init: false };

  const destination: DestinationNode.Destination = {
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
  instance: SourceNode.Instance,
  destination: DestinationNode.Destination,
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
  instance: SourceNode.Instance,
  destination: DestinationNode.Destination,
  event: WalkerOS.Event,
): Promise<boolean> {
  const { eventMapping, mappingKey } = getMappingEvent(
    event,
    destination.config.mapping,
  );

  let data: Destination.Data;

  if (eventMapping) {
    // Check if event should be processed or ignored
    if (eventMapping.ignore) return false;

    // Check to use specific event names
    if (eventMapping.name) event.event = eventMapping.name;

    // Transform event to a custom data
    if (eventMapping.data) {
      data = Array.isArray(eventMapping.data)
        ? eventMapping.data.map((item) => getMappingValue(event, item))
        : getMappingValue(event, eventMapping.data);
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
      debounce(async (destination, instance) => {
        useHooks(
          destination.pushBatch!,
          'DestinationPushBatch',
          instance.hooks,
        )(batched, destination.config, options);

        // Reset the batched queues
        // pushBatch isn't async yet, may cause trouble
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
