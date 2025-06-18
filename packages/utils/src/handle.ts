import type { WalkerOS } from '@walkerOS/types';
import type { Destination } from '@walkerOS/types';
import type { Elb } from '@walkerOS/types';
import { Commands, Const } from './constants';
import { addDestination } from './destination';
import { assign } from './assign';
import { isObject, isSameType } from './is';
import { setConsent } from './consent';

export async function commonHandleCommand(
  instance: WalkerOS.Instance,
  action: string,
  data?: unknown,
  options?: unknown,
): Promise<Elb.PushResult | undefined> {
  let result: Elb.PushResult | undefined;

  switch (action) {
    case Const.Commands.Consent:
      if (isObject(data)) {
        result = await setConsent(instance, data as WalkerOS.Consent);
      }
      break;

    case Const.Commands.Custom:
      if (isObject(data)) {
        instance.custom = assign(instance.custom, data as WalkerOS.Properties);
      }
      break;

    case Const.Commands.Destination:
      if (isObject(data) && typeof data.push === 'function') {
        result = await addDestination(
          instance,
          data as Destination.DestinationInit,
          options as Destination.Config,
        );
      }
      break;

    case Const.Commands.Globals:
      if (isObject(data)) {
        instance.globals = assign(
          instance.globals,
          data as WalkerOS.Properties,
        );
      }
      break;

    case Const.Commands.User:
      if (isObject(data)) {
        assign(instance.user, data as WalkerOS.User, { shallow: false });
      }
      break;
  }

  return result;
}

export function createEventOrCommand(
  instance: WalkerOS.Instance,
  nameOrEvent: unknown,
  defaults: WalkerOS.PartialEvent = {},
): { event?: WalkerOS.Event; command?: string } {
  // Determine the partial event
  const partialEvent: WalkerOS.PartialEvent = isSameType(
    nameOrEvent,
    '' as string,
  )
    ? { event: nameOrEvent, ...defaults }
    : { ...defaults, ...(nameOrEvent || {}) };

  if (!partialEvent.event) throw new Error('Event name is required');

  // Check for valid entity and action event format
  const [entityValue, actionValue] = partialEvent.event.split(' ');
  if (!entityValue || !actionValue) throw new Error('Event name is invalid');

  // It's a walker command
  if (entityValue === Commands.Walker) return { command: actionValue };

  // Regular event
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
    data = {},
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
    timing = 0,
    version = {
      source: instance.version,
      tagging: instance.config.tagging || 0,
    },
    source = { type: '', id: '', previous_id: '' },
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
