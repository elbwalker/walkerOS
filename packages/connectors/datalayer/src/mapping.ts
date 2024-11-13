import type { WalkerOS } from '@elbwalker/types';
import type { Config } from './types';
import { getId, getMappingValue } from '@elbwalker/utils';
import { convertConsentStates, isObject, isString } from './helper';

export function objToEvent(
  config: Config,
  obj: unknown,
): (WalkerOS.PartialEvent & { id: string }) | void {
  if (!(isObject(obj) && isString(obj.event))) return;

  const eventName = obj.event;
  const mapping = config.mapping ? config.mapping[eventName] : {};

  // Set default values first

  // id for duplicate detection
  const id = obj.id ? String(obj.id) : getId();
  delete obj.id;

  // event name
  let event = `${config.prefix} ${obj.event.replace(/ /g, '_')}`;
  delete obj.event;

  const source = { type: 'dataLayer' } as WalkerOS.Source;

  let data = obj as WalkerOS.Properties;

  if (mapping) {
    const mappedName = mapping.event && getMappingValue(obj, mapping.event);
    if (mappedName) event = String(mappedName);

    if (mapping.data)
      data = Object.entries(mapping.data).reduce((acc, [key, value]) => {
        acc[key] = getMappingValue(obj, value);
        return acc;
      }, {} as WalkerOS.Properties);
  }

  return { event, id, data, source };
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
