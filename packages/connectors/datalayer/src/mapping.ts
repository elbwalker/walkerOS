import type { WalkerOS } from '@elbwalker/types';
import type {
  Config,
  EventMappingObjectValues,
  EventMappingValues,
  Value,
} from './types';
import { getId, getMappingValue } from '@elbwalker/utils';
import { convertConsentStates, isObject, isString } from './helper';

export function objToEvent(
  config: Config,
  obj: unknown,
): (WalkerOS.DeepPartialEvent & { id: string }) | void {
  if (!(isObject(obj) && isString(obj.event))) return;

  const mapping = config.mapping ? config.mapping[obj.event] : {};

  // id for duplicate detection
  const id = obj.id ? String(obj.id) : getId();
  delete obj.id;

  let event: WalkerOS.DeepPartialEvent & { id: string } = {
    id,
    data: obj as WalkerOS.Properties,
  };

  // event name
  let eventName = `${config.prefix} ${obj.event.replace(/ /g, '_')}`;

  if (mapping) {
    if (mapping.event) eventName = mapping.event;

    const eventMappingValueKeys: Array<keyof EventMappingValues> = [
      'id',
      'trigger',
      'entity',
      'action',
      'timestamp',
      'timing',
      'group',
      'count',
    ];

    event = eventMappingValueKeys.reduce((acc, key) => {
      const config = mapping[key];
      if (config)
        (acc as WalkerOS.Properties)[key] = getMappingValue(obj, config);
      return acc;
    }, event);

    const eventMappingObjectValueKeys: Array<keyof EventMappingObjectValues> = [
      'data',
      'globals',
      'custom',
      'user',
      'consent',
      'version',
      'source',
    ];

    const objectValues = eventMappingObjectValueKeys.reduce((acc, key) => {
      const config = mapping[key];
      if (config) acc[key] = mapEntries(obj, config);
      return acc;
    }, {} as WalkerOS.AnyObject);
    event = { ...event, ...objectValues };

    if (mapping.context) {
      event.context = Object.entries(
        mapEntries(obj, mapping.context ?? {}),
      ).reduce((acc, [key, value]) => {
        if (value) acc[key] = [value, 0];
        return acc;
      }, {} as WalkerOS.OrderedProperties);
    }

    if (mapping.nested) {
      const nested: WalkerOS.Entities = [];
      const config = mapping.nested;

      const nestedData = mapEntries(obj, config.data ?? {});
      const maxLength = Math.max(
        ...Object.values(nestedData)
          .filter((value) => Array.isArray(value))
          .map((array) => array.length),
      );

      for (let i = 0; i < maxLength; i++) {
        const data = Object.entries(nestedData).reduce((acc, [key, value]) => {
          acc[key] = Array.isArray(value) ? value[i] : value;
          return acc;
        }, {} as WalkerOS.Properties);
        nested.push({
          type: String(
            getMappingValue(
              obj,
              config.type || { value: 'item' },
              undefined,
              i,
            ),
          ),
          data: data,
          nested: [],
          context: event.context || {},
        });
      }

      event.nested = nested;
    }
  }

  // Update the event name
  event.event = eventName;

  // source type is dataLayer
  event.source = event.source ?? {};
  event.source.type = event.source.type ?? 'dataLayer';

  return event;
}

function mapEntries(
  obj: WalkerOS.AnyObject,
  mapping: Record<string, Value | undefined>,
): WalkerOS.Properties {
  return Object.entries(mapping).reduce((acc, [key, value]) => {
    if (value) {
      acc[key] = getMappingValue(obj, value);
    }
    return acc;
  }, {} as WalkerOS.Properties);
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
