import type { WalkerOS } from '@elbwalker/types';
import type { SourceNode, Elb } from '../types';
import { assign, isCommand, isSameType, tryCatchAsync } from '@elbwalker/utils';
import { handleCommand, handleEvent } from './handle';

export function createPush(instance: SourceNode.Instance): Elb.Fn {
  const push = async (
    nameOrEvent: unknown,
    data: Elb.PushData = {},
    options?: Elb.PushOptions,
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
        data: Elb.PushData,
        options?: Elb.PushOptions,
      ): Elb.Return => {
        const { event, command } = createEventOrCommand(
          instance,
          nameOrEvent,
          data,
        );

        if (command) {
          // Command event
          const commandResult = await handleCommand(
            instance,
            command,
            data,
            options,
          );
          result = assign(result, commandResult);
        } else if (event) {
          // Regular event
          const eventResult = await handleEvent(instance, event);
          result = assign(result, eventResult);
          result.event = event;
        }

        return assign({ status: { ok: true } }, result);
      },
      (error) => {
        // Call custom error handling
        if (instance.config.onError) instance.config.onError(error, instance);

        result.status.error = String(error);
        return result;
      },
    )(nameOrEvent, data, options);
  };

  return push;
}

function createEventOrCommand(
  instance: SourceNode.Instance,
  nameOrEvent: unknown,
  pushData: Elb.PushData,
): { event?: WalkerOS.Event; command?: string } {
  // Determine the partial event
  const partialEvent: WalkerOS.PartialEvent = isSameType(
    nameOrEvent,
    '' as string,
  )
    ? { event: nameOrEvent }
    : ((nameOrEvent || {}) as WalkerOS.PartialEvent);

  if (!partialEvent.event) throw new Error('Event name is required');

  // Check for valid entity and action event format
  const [entityValue, actionValue] = partialEvent.event.split(' ');
  if (!entityValue || !actionValue) throw new Error('Event name is invalid');

  // It's a walker command
  if (isCommand(entityValue)) return { command: actionValue };

  // Regular event

  // Increase event counter
  ++instance.count;

  // Values that are eventually used by other properties
  const {
    timestamp = Date.now(),
    group = instance.group,
    count = instance.count,
  } = partialEvent;

  // Extract properties with default fallbacks
  const {
    event = `${entityValue} ${actionValue}`,
    data = isSameType(pushData, {} as WalkerOS.Properties) ? pushData : {},
    context = {},
    globals = instance.globals,
    custom = {},
    user = instance.user,
    nested = [],
    consent = instance.consent,
    id = `${timestamp}-${group}-${count}`,
    trigger = '',
    entity = entityValue,
    action = actionValue,
    timing = Math.round((Date.now() - instance.timing) / 10) / 100,
    version = {
      source: instance.version,
      tagging: instance.config.tagging || 0,
    },
    source = { type: 'node', id: '', previous_id: '' },
  } = partialEvent;

  const fullEvent: WalkerOS.Event = {
    event,
    data,
    context,
    globals,
    custom,
    user,
    nested,
    consent,
    id,
    trigger,
    entity,
    action,
    timestamp,
    timing,
    group,
    count,
    version,
    source,
  };

  return { event: fullEvent };
}
