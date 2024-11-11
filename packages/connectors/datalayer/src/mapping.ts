import type { WalkerOS } from '@elbwalker/types';
import { convertConsentStates, isObject, isString } from './helper';

export function objToEvent(obj: unknown): WalkerOS.PartialEvent | void {
  if (!(isObject(obj) && isString(obj.event))) return;

  return { ...obj };
}

// https://developers.google.com/tag-platform/gtagjs/reference
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
    case 'config':
      if (!isString(value)) break;
      event = `${command} ${value}`;

      if (isObject(params)) data = convertConsentStates(params);
      break;
    case 'consent':
      if (!isString(value)) break;
      event = `${command} ${value}`;

      if (isObject(params)) data = convertConsentStates(params);
      break;
    case 'set':
      if (!isString(value)) break;
      event = `${command} ${value}`;

      if (isObject(params)) data = params;
      break;
    default:
      // Ignore command (like get)
      return;
  }

  return { data, event };
}
