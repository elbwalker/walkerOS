import type { WalkerOS } from './types';
import type { Destination } from './types';
import type { Elb } from './types';
import { Commands, Const } from './constants';
import { addDestination } from './destination';
import { assign } from './assign';
import { isObject, isSameType } from './is';
import { setConsent } from './consent';

export async function commonHandleCommand(
  collector: WalkerOS.Collector,
  action: string,
  data?: unknown,
  options?: unknown,
): Promise<Elb.PushResult | undefined> {
  let result: Elb.PushResult | undefined;

  switch (action) {
    case Const.Commands.Consent:
      if (isObject(data)) {
        result = await setConsent(collector, data as WalkerOS.Consent);
      }
      break;

    case Const.Commands.Custom:
      if (isObject(data)) {
        collector.custom = assign(
          collector.custom,
          data as WalkerOS.Properties,
        );
      }
      break;

    case Const.Commands.Destination:
      if (isObject(data) && typeof data.push === 'function') {
        result = await addDestination(
          collector,
          data as Destination.Init,
          options as Destination.Config,
        );
      }
      break;

    case Const.Commands.Globals:
      if (isObject(data)) {
        collector.globals = assign(
          collector.globals,
          data as WalkerOS.Properties,
        );
      }
      break;

    case Const.Commands.User:
      if (isObject(data)) {
        assign(collector.user, data as WalkerOS.User, { shallow: false });
      }
      break;
  }

  return result;
}

export function createEventOrCommand(
  collector: WalkerOS.Collector,
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
  ++collector.count;

  // Values that are eventually used by other properties
  const {
    timestamp = Date.now(),
    group = collector.group,
    count = collector.count,
  } = partialEvent;

  // Extract properties with default fallbacks
  const {
    event = `${entityValue} ${actionValue}`,
    data = {},
    context = {},
    globals = collector.globals,
    custom = {},
    user = collector.user,
    nested = [],
    consent = collector.consent,
    id = `${timestamp}-${group}-${count}`,
    trigger = '',
    entity = entityValue,
    action = actionValue,
    timing = 0,
    version = {
      source: collector.version,
      tagging: collector.config.tagging || 0,
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
