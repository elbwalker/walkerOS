import type { Destination, Mapping, WalkerOS } from '@elbwalker/types';
import type { DestinationWeb, SourceWalkerjs } from '@elbwalker/walker.js';
import {
  assign,
  debounce,
  getMappingEvent,
  getMappingValue,
  isDefined,
  isObject,
  tryCatch,
  useHooks,
} from '@elbwalker/utils';

function resolveMappingData(
  event: WalkerOS.Event,
  data?: Mapping.Data,
): Destination.Data {
  if (!data) return;

  return Array.isArray(data)
    ? data.map((item) => getMappingValue(event, item))
    : getMappingValue(event, data);
}

export function destinationPush(
  instance: SourceWalkerjs.Instance,
  destination: DestinationWeb.Destination,
  event: WalkerOS.Event,
): boolean {
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

  return !!tryCatch(() => {
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
      useHooks(destination.push, 'DestinationPush', instance.hooks)(
        event,
        destination.config,
        eventMapping,
        options,
      );
    }

    return true;
  })();
}
