import type { WalkerOS } from '@elbwalker/types';
import type { Config, EventConfig, MappedEvent, Mapping } from './types';
import { getId, getMappingValue, isObject, isString } from '@elbwalker/utils';
import { convertConsentStates } from './helper';

const defaultMapping: Mapping = {
  'consent default': { ignore: true },
  'consent update': {
    command: true,
    name: 'walker consent',
    data: {
      map: {
        data: {
          map: {
            // @TODO update list
            marketing: 'ad_storage',
            analytics: 'analytics_storage',
          },
        },
      },
    },
  },
};

function getMapping(name: string, mapping: Mapping): EventConfig {
  return mapping[name] || mapping['*'] || {};
}

export function objToEvent(obj: unknown, config: Config): MappedEvent | void {
  if (!(isObject(obj) && isString(obj.event))) return;

  const mapping = getMapping(obj.event, {
    ...defaultMapping,
    ...config.mapping,
  });

  const { command, data, ignore, name } = mapping;

  if (ignore) return;

  // Mapping values
  const values = Array.isArray(data)
    ? data.map((item) => getMappingValue(event, item))
    : getMappingValue(obj, data || {});

  // id for duplicate detection
  const id = obj.id ? String(obj.id) : getId();

  const event: WalkerOS.DeepPartialEvent & { id: string } = {
    id,
    data: obj as WalkerOS.Properties,
    ...(isObject(values) ? values : {}),
  };

  // Update the context structure
  if (event.context) {
    event.context = Object.entries(event.context).reduce(
      (acc, [key, value]) => {
        if (isString(value)) acc[key] = [value, 0];
        return acc;
      },
      {} as WalkerOS.OrderedProperties,
    );
  }

  // Update the nested structure
  if (event.nested) {
    event.nested = event.nested.map((nested) => {
      const { type, data } = nested || {};

      return {
        type: type || 'product',
        data: data || {},
        nested: [],
        context: {},
      } as WalkerOS.Entity;
    });
  }

  // Update the event name
  event.event =
    event.event || name || `${config.prefix} ${obj.event.replace(/ /g, '_')}`;

  // source type is dataLayer
  event.source = event.source ?? {};
  event.source.type = event.source.type ?? 'dataLayer';

  return { command, event };
}

// https://developers.google.com/tag-platform/gtagjs/reference
export function gtagToObj(args: IArguments): WalkerOS.AnyObject | void {
  const [command, value, params] = args;

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
      if (isObject(value)) obj = value;
      event = `${command} ${isString(value) ? value : 'custom'}`;
      break;
    default:
      // Ignore command (like get)
      return;
  }

  return { ...obj, event };
}
