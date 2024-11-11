import type { WalkerOS } from '@elbwalker/types';
import { convertConsentStates, isObject, isString } from './helper';

export function objToEvent(
  event: WalkerOS.AnyObject,
): WalkerOS.PartialEvent | void {
  if (typeof event.event !== 'string') return;

  // @TODO other values
  return { event: event.event };
}

export function gtagToObj(args: WalkerOS.AnyObject): WalkerOS.AnyObject | void {
  const command = args[0];
  const value = args[1];
  const params = args[2];

  let event: string | undefined;
  let data: WalkerOS.AnyObject = {};

  switch (command) {
    case 'event':
      if (!isString(value)) break;
      event = value;

      if (isObject(params)) data = params;
      break;
    case 'consent':
      if (!isString(value)) break;
      event = `${command} ${value}`;

      if (isObject(params)) data = convertConsentStates(params);
      break;
    default:
      // Unknown command
      return;
  }

  return { data, event };
}
