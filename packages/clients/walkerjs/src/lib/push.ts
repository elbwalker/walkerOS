import type { WalkerOS } from '@elbwalker/types';
import type { WebClient, WebDestination } from '../types';
import { allowedToPush, createEventOrCommand, isArgument } from './helper';
import { handleCommand, handleEvent } from './handle';
import {
  Const,
  assign,
  debounce,
  isSameType,
  tryCatch,
  useHooks,
} from '@elbwalker/utils';

export function createPush(instance: WebClient.Instance): WebClient.Elb {
  const push = (
    nameOrEvent?: unknown,
    pushData: WebClient.PushData = {},
    options: WebClient.PushOptions = '',
    pushContext: WebClient.PushContext = {},
    nested: WalkerOS.Entities = [],
    custom: WalkerOS.Properties = {},
  ) => {
    const { event, command } = createEventOrCommand(
      instance,
      nameOrEvent,
      pushData,
      pushContext,
      nested,
      custom,
      options,
    );

    if (command) {
      // Command event
      handleCommand(instance, command, pushData, options);
    } else if (event) {
      // Regular event
      handleEvent(instance, event);
    }
  };

  return useHooks(push, 'Push', instance.hooks);
}

export function elbLayerInit(instance: WebClient.Instance) {
  const elbLayer = instance.config.elbLayer;

  elbLayer.push = function (...args: WebClient.ElbLayer) {
    // Pushed as Arguments
    if (isArgument(args[0])) {
      args = args[0] as unknown as WebClient.ElbLayer;
    }

    const i = Array.prototype.push.apply(this, [args]);
    instance.push(...args);

    return i;
  };

  // Call all predefined commands
  pushPredefined(instance, true);
}

export function pushPredefined(
  instance: WebClient.Instance,
  commandsOnly: boolean,
) {
  // Handle existing events in the elbLayer on first run
  // there is a special execution order for all predefined events
  // walker events gets prioritized before others
  // this guarantees a fully configuration before the first run
  const walkerCommand = `${Const.Commands.Walker} `; // Space on purpose
  const events: Array<WebClient.ElbLayer> = [];
  let isFirstRunEvent = true;

  // At that time the elbLayer was not yet initialized
  instance.config.elbLayer.map((pushedEvent) => {
    const event = [
      ...Array.from(pushedEvent as IArguments),
    ] as WebClient.ElbLayer;

    if (!isSameType(event[0], '')) return;

    // Skip the first stacked run event since it's the reason we're here
    // and to prevent duplicate execution which we don't want
    const runCommand = `${Const.Commands.Walker} ${Const.Commands.Run}`;
    if (isFirstRunEvent && event[0] == runCommand) {
      isFirstRunEvent = false; // Next time it's on
      return;
    }

    // Handle commands and events separately
    if (
      (commandsOnly && event[0].startsWith(walkerCommand)) || // Only commands
      (!commandsOnly && !event[0].startsWith(walkerCommand)) // Only events
    )
      events.push(event);
  });

  events.map((item) => {
    instance.push(...item);
  });
}

export function pushToDestination(
  instance: WebClient.Instance,
  destination: WebDestination.Destination,
  event: WalkerOS.Event,
  useQueue = true,
): boolean {
  // Copy the event to prevent mutation
  event = assign({}, event);

  // Always check for required consent states before pushing
  if (!allowedToPush(instance, destination)) {
    if (useQueue) {
      destination.queue = destination.queue || [];
      destination.queue.push(event);
    }

    // Stop processing the event on this destination
    return false;
  }

  // Check for an active mapping for proper event handling
  let mappingEvent: WebDestination.EventConfig;
  const mapping = destination.config.mapping;
  if (mapping) {
    const mappingEntity = mapping[event.entity] || mapping['*'] || {};
    mappingEvent = mappingEntity[event.action] || mappingEntity['*'];

    // Handle individual event settings
    if (mappingEvent) {
      // Check if event should be processed or ignored
      if (mappingEvent.ignore) return false;

      // Check to use specific event names
      if (mappingEvent.name) event.event = mappingEvent.name;
    }
  }

  const pushed = !!tryCatch(() => {
    // Destination initialization
    // Check if the destination was initialized properly or try to do so
    if (destination.init && !destination.config.init) {
      const init =
        useHooks(
          destination.init,
          'DestinationInit',
          instance.hooks,
        )(destination.config) !== false; // Actively check for errors

      destination.config.init = init;

      // don't push if init is false
      if (!init) return false;
    }

    // Debounce the event if needed
    const batch = mappingEvent?.batch;
    if (batch && destination.pushBatch) {
      destination.batch = destination.batch || [];
      destination.batch.push({ event, mapping: mappingEvent });

      destination.batchFn =
        destination.batchFn ||
        debounce((destination, instance) => {
          useHooks(destination.pushBatch!, 'DestinationPush', instance.hooks)(
            destination.batch || [],
            destination.config,
            instance,
          );
        }, batch);

      destination.batchFn!(destination, instance);
    } else {
      // It's time to go to the destination's side now
      useHooks(destination.push, 'DestinationPush', instance.hooks)(
        event,
        destination.config,
        mappingEvent,
        instance,
      );
    }

    return true;
  })();

  return pushed;
}
