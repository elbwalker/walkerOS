import type { WalkerOS } from '@elbwalker/types';
import type {
  Config,
  EventConfig,
  EventMappingObjectValues,
  EventMappingValues,
  MappedEvent,
  Mapping,
  Value,
} from './types';
import { getId, getMappingValue, isObject } from '@elbwalker/utils';
import { convertConsentStates, isString } from './helper';

const defaultMapping: Mapping = {
  'consent default': {
    ignore: true,
  },
  'consent update': {
    command: true,
    name: 'walker consent',
    custom: {
      data: {
        // @TODO update list
        marketing: 'ad_storage',
        analytics: 'analytics_storage',
      },
    },
  },
};

function getMapping(name: string, mapping: Mapping): EventConfig {
  return mapping[name] || mapping['*'] || {};
}

export function objToEvent(config: Config, obj: unknown): MappedEvent | void {
  if (!(isObject(obj) && isString(obj.event))) return;

  const mapping = getMapping(
    obj.event,
    Object.assign(defaultMapping, config.mapping),
  );
  const { command, custom, ignore, name } = mapping;

  if (ignore) return;

  // id for duplicate detection
  const id = obj.id ? String(obj.id) : getId();
  delete obj.id;

  let event: WalkerOS.DeepPartialEvent & { id: string } = {
    id,
    data: obj as WalkerOS.Properties,
  };

  if (custom) {
    const eventMappingValueKeys: Array<keyof EventMappingValues> = [
      'event',
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
      const config = custom[key];
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
      const config = custom[key];
      if (config) acc[key] = mapEntries(obj, config);
      return acc;
    }, {} as WalkerOS.AnyObject);
    event = { ...event, ...objectValues };

    if (custom.context) {
      event.context = Object.entries(
        mapEntries(obj, custom.context ?? {}),
      ).reduce((acc, [key, value]) => {
        if (value) acc[key] = [value, 0];
        return acc;
      }, {} as WalkerOS.OrderedProperties);
    }

    if (custom.nested) {
      const nested: WalkerOS.Entities = [];
      const config = custom.nested;

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
            getMappingValue(obj, config.type || { value: 'item' }, {
              props: i,
            }),
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
  event.event =
    event.event || name || `${config.prefix} ${obj.event.replace(/ /g, '_')}`;

  // source type is dataLayer
  event.source = event.source ?? {};
  event.source.type = event.source.type ?? 'dataLayer';

  return { command, event };
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
