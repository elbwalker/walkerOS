import type { WalkerOS } from '@elbwalker/types';
import type { Elb, SourceWalkerjs } from '../types';
import { handleCommand } from './handle';
import {
  Const,
  createEventOrCommand,
  createPushResult,
  isArguments,
  isArray,
  isElementOrDocument,
  isObject,
  isSameType,
  isString,
  pushToDestinations,
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
    let result: Elb.PushResult;

    return await tryCatchAsync(
      async (
        nameOrEvent: unknown,
        pushData: Elb.PushData,
        options: Elb.PushOptions,
        pushContext: Elb.PushContext,
        nested: WalkerOS.Entities,
        custom: WalkerOS.Properties,
      ): Promise<Elb.PushResult> => {
        const [entity] = String(
          isObject(nameOrEvent) ? nameOrEvent.event : nameOrEvent,
        ).split(' ');

        // Get data and context either from elements or parameters
        let data = isSameType(pushData, {} as WalkerOS.Properties)
          ? pushData
          : {};

        let eventContext: WalkerOS.OrderedProperties = {};

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
          const entityObj = getEntities(
            instance.config.prefix,
            elemParameter,
          ).find((obj) => obj.type === entity);
          if (entityObj) {
            if (dataIsElem) data = entityObj.data;
            eventContext = entityObj.context;
          }
        }

        if (entity === 'page') {
          data.id = data.id || window.location.pathname;
        }

        const { event, command } = createEventOrCommand(instance, nameOrEvent, {
          data,
          context: eventContext,
          nested,
          custom,
          trigger: options ? String(options) : '',
          timing: Math.round((performance.now() - instance.timing) / 10) / 100,
          source: {
            type: 'web',
            id: window.location.href,
            previous_id: document.referrer,
          },
        });

        if (command) {
          // Command event
          result = await handleCommand(instance, command, pushData, options);
        } else if (event) {
          // Regular event
          result = await pushToDestinations(instance, event);
        }

        return createPushResult(result);
      },
      (error) => {
        // Call custom error handling
        if (instance.config.onError) instance.config.onError(error, instance);

        return createPushResult({ ok: false });
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
