import type { WalkerOS } from '@elbwalker/types';
import type { WebClient, WebDestination } from '../types';
import { isArgument, isCommand, isElementOrDocument } from './helper';
import { handleCommand, handleEvent } from './handle';
import {
  Const,
  assign,
  debounce,
  isSameType,
  tryCatch,
  useHooks,
} from '@elbwalker/utils';
import { allowedToPush } from './consent';
import { getEntities } from './walker';

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
  let mappingKey = '';

  if (mapping) {
    let mappingEntityKey = event.entity; // Default key is the entity name
    let mappingEntity = mapping[mappingEntityKey];

    if (!mappingEntity) {
      // Fallback to the wildcard key
      mappingEntityKey = '*';
      mappingEntity = mapping[mappingEntityKey];
    }

    if (mappingEntity) {
      let mappingActionKey = event.action; // Default action is the event action
      mappingEvent = mappingEntity[mappingActionKey];

      if (!mappingEvent) {
        // Fallback to the wildcard action
        mappingActionKey = '*';
        mappingEvent = mappingEntity[mappingActionKey];
      }

      // Handle individual event settings
      if (mappingEvent) {
        // Check if event should be processed or ignored
        if (mappingEvent.ignore) return false;

        // Check to use specific event names
        if (mappingEvent.name) event.event = mappingEvent.name;

        // Save the mapping key for later use
        mappingKey = `${mappingEntityKey} ${mappingActionKey}`;
      }
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
        )(destination.config, instance) !== false; // Actively check for errors

      destination.config.init = init;

      // don't push if init is false
      if (!init) return false;
    }

    // Debounce the event if needed
    const batch = mappingEvent?.batch;
    if (mappingEvent && batch && destination.pushBatch) {
      const batched = mappingEvent.batched || {
        key: mappingKey,
        events: [],
      };
      batched.events.push(event);

      mappingEvent.batchFn =
        mappingEvent.batchFn ||
        debounce((destination, instance) => {
          useHooks(
            destination.pushBatch!,
            'DestinationPushBatch',
            instance.hooks,
          )(batched, destination.config, instance);

          // Reset the batched events queue
          batched.events = [];
        }, batch);

      mappingEvent.batched = batched;
      mappingEvent.batchFn(destination, instance);
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
