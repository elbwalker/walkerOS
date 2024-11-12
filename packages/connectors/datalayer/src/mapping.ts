import type { WalkerOS } from '@elbwalker/types';
import { getId } from '@elbwalker/utils';
import { convertConsentStates, isObject, isString } from './helper';

export function objToEvent(obj: unknown): WalkerOS.PartialEvent | void {
  if (!(isObject(obj) && isString(obj.event))) return;

  const event = obj.event;
  delete obj.event;

  const data = obj as WalkerOS.Properties;

  // Add an id for duplicate detection
  if (!data.id) data.id = getId();

  return { event, data };
}

// https://developers.google.com/tag-platform/gtagjs/reference
export function gtagToObj(args: WalkerOS.AnyObject): WalkerOS.AnyObject | void {
  const command = args[0];
  const value = args[1];
  const params = args[2];

  let event: string | undefined;
  let obj = isObject(params) ? params : {};

  switch (command) {
    case 'event':
      if (!isString(value)) break;
      event = value;
      break;
    case 'config':
      if (!isString(value)) break;
      event = `${command} ${value}`;
      break;
    case 'consent':
      if (!isString(value)) break;
      event = `${command} ${value}`;
      obj = convertConsentStates(obj);
      break;
    case 'set':
      if (!isString(value)) break;
      event = `${command} ${value}`;
      break;
    default:
      // Ignore command (like get)
      return;
  }

  return { ...obj, event };
}
