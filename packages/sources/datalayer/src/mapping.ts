import type { WalkerOS } from '@elbwalker/types';
import type { Config, EventConfig, MappedEvent, Mapping } from './types';
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
  const { command, data, ignore, name } = mapping;

  if (ignore) return;

  // Mapping values
  const values = Array.isArray(data)
    ? data.map((item) => getMappingValue(event, item))
    : getMappingValue(obj, data || {});

  // id for duplicate detection
  const id = obj.id ? String(obj.id) : getId();
  delete obj.id;

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
