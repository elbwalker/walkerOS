import type { WalkerOS } from '@elbwalker/types';
import type { Elb, SourceWalkerjs } from '../types';
import { isCommand, isElementOrDocument } from './helper';
import { handleCommand, handleEvent } from './handle';
import {
  Const,
  assign,
  isArguments,
  isArray,
  isObject,
  isSameType,
  isString,
  tryCatchAsync,
  useHooks,
} from '@elbwalker/utils';
import { getEntities } from './walker';

export function createPush(instance: SourceWalkerjs.Instance): Elb.Fn {
  const push = async (
    nameOrEvent?: unknown,
    pushData: Elb.PushData = {},
    options: Elb.PushOptions = '',
    pushContext: Elb.PushContext = {},
    nested: WalkerOS.Entities = [],
    custom: WalkerOS.Properties = {},
  ) => {
    let result: Elb.PushResult = {
      status: { ok: false },
      successful: [],
      queued: [],
      failed: [],
    };

    return await tryCatchAsync(
      async (
        nameOrEvent: unknown,
        pushData: Elb.PushData,
        options: Elb.PushOptions,
        pushContext: Elb.PushContext,
        nested: WalkerOS.Entities,
        custom: WalkerOS.Properties,
      ): Promise<Elb.PushResult> => {
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
          await handleCommand(instance, command, pushData, options);
        } else if (event) {
          // Regular event
          await handleEvent(instance, event);
        }

        return assign({ status: { ok: true } }, result);
      },
      (error) => {
        // Call custom error handling
        if (instance.config.onError) instance.config.onError(error, instance);

        result.status.error = String(error);
        return result;
      },
    )(nameOrEvent, pushData, options, pushContext, nested, custom);
  };

  return useHooks(push, 'Push', instance.hooks);
}

export function elbLayerInit(instance: SourceWalkerjs.Instance) {
  const elbLayer = instance.config.elbLayer;

  elbLayer.push = function (...args: Elb.Layer) {
    // Pushed as Arguments
    if (isArguments(args[0])) args = [...Array.from(args[0])];

    const i = Array.prototype.push.apply(this, [args]);
    instance.push(...(args as Parameters<Elb.Fn>));

    return i;
  };

  // Call all predefined commands
  pushPredefined(instance, true);
}

export function pushPredefined(
  instance: SourceWalkerjs.Instance,
  commandsOnly: boolean,
) {
  // Handle existing events in the elbLayer on first run
  // there is a special execution order for all predefined events
  // walker events gets prioritized before others
  // this guarantees a fully configuration before the first run
  const walkerCommand = `${Const.Commands.Walker} `; // Space on purpose
  const events: Array<Parameters<Elb.Fn>> = [];
  let isFirstRunEvent = true;

  // At that time the elbLayer was not yet initialized
  instance.config.elbLayer.map((pushedItem) => {
    const item = isArguments(pushedItem)
      ? [...Array.from(pushedItem)]
      : isArray(pushedItem)
      ? pushedItem
      : [pushedItem];

    const firstParam = item[0];
    const isCommand =
      !isObject(firstParam) && String(firstParam).startsWith(walkerCommand);

    if (!isObject(firstParam)) {
      const args = Array.from(item);
      if (!isString(args[0])) return;

      // Skip the first stacked run event since it's the reason we're here
      // and to prevent duplicate execution which we don't want
      const runCommand = `${Const.Commands.Walker} ${Const.Commands.Run}`;
      if (isFirstRunEvent && args[0] == runCommand) {
        isFirstRunEvent = false; // Next time it's on
        return;
      }
    }

    // Handle commands and events separately
    if (
      (commandsOnly && isCommand) || // Only commands
      (!commandsOnly && !isCommand) // Only events
    )
      events.push(item as Parameters<Elb.Fn>);
  });

  events.map((item) => {
    instance.push(...item);
  });
}

function createEventOrCommand(
  instance: SourceWalkerjs.Instance,
  nameOrEvent: unknown,
  pushData: Elb.PushData,
  pushContext: Elb.PushContext,
  initialNested: WalkerOS.Entities,
  initialCustom: WalkerOS.Properties,
  initialTrigger: Elb.PushOptions = '',
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
    context = {},
    globals = instance.globals,
    custom = initialCustom || {},
    user = instance.user,
    nested = initialNested || [],
    consent = instance.consent,
    trigger = initialTrigger ? String(initialTrigger) : '',
    timestamp = Date.now(),
    group = instance.group,
    count = instance.count,
    version = {
      source: instance.version,
      tagging: instance.config.tagging || 0,
    },
    source = {
      type: 'web',
      id: window.location.href,
      previous_id: document.referrer,
    },
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
  } else if (Object.keys(pushContext).length) {
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
    globals,
    custom,
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
    version,
    source,
  };

  return { event };
}
