import type {
  Destination as WalkerOSDestination,
  Mapping,
  WalkerOS,
} from '@elbwalker/types';
import {
  getMappingEvent,
  getMappingValue,
  isDefined,
  assign,
  isObject,
  useHooks,
  debounce,
} from './index';

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
  const { eventMapping, mappingKey } = getMappingEvent(event, config.mapping);

  let data = resolveMappingData(event, config.data);

  if (eventMapping) {
    // Check if event should be processed or ignored
    if (eventMapping.ignore) return false;

    // Check to use specific event names
    if (eventMapping.name) event.event = eventMapping.name;

    // Transform event to a custom data
    if (eventMapping.data) {
      const dataEvent = resolveMappingData(event, eventMapping.data);
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

function resolveMappingData(
  event: WalkerOS.Event,
  data?: Mapping.Data,
): WalkerOSDestination.Data {
  if (!data) return;

  return getMappingValue(event, data);
}

export { resolveMappingData };
