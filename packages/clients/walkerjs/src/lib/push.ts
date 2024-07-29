import type { WalkerOS } from '@elbwalker/types';
import type { WebClient } from '../types';
import { isArgument, isCommand, isElementOrDocument } from './helper';
import { handleCommand, handleEvent } from './handle';
import {
  Const,
  assign,
  isSameType,
  tryCatch,
  useHooks,
} from '@elbwalker/utils';
import { allowedToPush } from './consent';
import { getEntities } from './walker';
import { destinationInit, destinationPush } from './destination';

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

export function pushToDestinations(
  instance: WebClient.Instance,
  destinations: WebClient.Destinations,
  event?: WalkerOS.Event,
) {
  Object.values(destinations).forEach((destination) => {
    destination.queue = destination.queue || [];

    // Add event to queue stack
    if (event) destination.queue.push(event);

    // Always check for required consent states before pushing
    if (!allowedToPush(instance, destination)) return false; // Don't push if not allowed

    // Init destination if events are in queue
    if (destination.queue.length > 0) {
      // Initialize the destination if needed
      const isInitialized = tryCatch(destinationInit)(instance, destination);
      if (!isInitialized) return false;
    }

    const { consent, globals, user } = instance;

    // Process the destinations event queue
    destination.queue = destination.queue.filter((event) => {
      // Copy the event to prevent mutation
      event = event
        ? assign(event, {
            // Update previous values with the current state
            consent,
            globals,
            user,
          })
        : event; // undefined

      //Try to push and remove successful ones from queue
      return !destinationPush(instance, destination, event);
    });
  });
}

function createEventOrCommand(
  instance: WebClient.Instance,
  nameOrEvent: unknown,
  pushData: WebClient.PushData,
  pushContext: WebClient.PushContext,
  initialNested: WalkerOS.Entities,
  initialCustom: WalkerOS.Properties,
  initialTrigger: WebClient.PushOptions = '',
): { event?: WalkerOS.Event; command?: string } {
  // Determine the partial event
  const partialEvent: WalkerOS.PartialEvent = isSameType(
    nameOrEvent,
    '' as string,
  )
    ? { event: nameOrEvent }
    : ((nameOrEvent || {}) as WalkerOS.PartialEvent);

  if (!partialEvent.event) return {};

  // Check for valid entity and action event format
  const [entity, action] = partialEvent.event.split(' ');
  if (!entity || !action) return {};

  // It's a walker command
  if (isCommand(entity)) return { command: action };

  // Regular event

  // Increase event counter
  ++instance.count;

  // Extract properties with default fallbacks
  const {
    timestamp = Date.now(),
    group = instance.group,
    count = instance.count,
    source = {
      type: 'web',
      id: window.location.href,
      previous_id: document.referrer,
    },
    context = {},
    globals = instance.globals,
    user = instance.user,
    nested = initialNested || [],
    consent = instance.consent,
    trigger = isSameType(initialTrigger, '') ? initialTrigger : '',
    version = { tagging: instance.config.tagging },
  } = partialEvent;

  // Get data and context either from elements or parameters
  let data: WalkerOS.Properties =
    partialEvent.data ||
    (isSameType(pushData, {} as WalkerOS.Properties) ? pushData : {});

  let eventContext: WalkerOS.OrderedProperties = context;

  let elemParameter: undefined | Element;
  let dataIsElem = false;
  if (isElementOrDocument(pushData)) {
    elemParameter = pushData;
    dataIsElem = true;
  }

  if (isElementOrDocument(pushContext)) {
    elemParameter = pushContext;
  } else if (isSameType(pushContext, {} as WalkerOS.OrderedProperties)) {
    eventContext = pushContext;
  }

  if (elemParameter) {
    const entityObj = getEntities(instance.config.prefix, elemParameter).find(
      (obj) => obj.type == entity,
    );
    if (entityObj) {
      if (dataIsElem) data = entityObj.data;
      eventContext = entityObj.context;
    }
  }

  if (entity === 'page') {
    data.id = data.id || window.location.pathname;
  }

  const timing =
    partialEvent.timing ||
    Math.round((performance.now() - instance.timing) / 10) / 100;

  const event: WalkerOS.Event = {
    event: `${entity} ${action}`,
    data,
    context: eventContext,
    custom: partialEvent.custom || initialCustom || {},
    globals,
    user,
    nested,
    consent,
    trigger,
    entity,
    action,
    timestamp,
    timing,
    group,
    count,
    id: `${timestamp}-${group}-${count}`,
    version: {
      client: instance.client,
      tagging: version.tagging,
    },
    source,
  };

  return { event };
}
