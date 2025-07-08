import type { WalkerOS } from '@walkerOS/types';
import type { Config, Rule, MappedEvent, Mapping } from './types';
import {
  getId,
  getMappingValue,
  isDefined,
  isObject,
  isString,
} from '@walkerOS/utils';
import { convertConsentStates } from './helper';

const defaultMapping: Mapping = {
  'consent default': { ignore: true },
  'consent update': {
    name: 'walker consent',
    settings: {
      command: {
        map: {
          // @TODO update list
          marketing: 'ad_storage',
          analytics: 'analytics_storage',
        },
      },
    },
  },
};

function getMapping(name: string, mapping: Mapping): Rule {
  return mapping[name] || mapping['*'] || {};
}

export async function objToEvent(
  obj: unknown,
  config: Config,
): Promise<MappedEvent | void> {
  if (!(isObject(obj) && isString(obj.event))) return;

  const mapping = getMapping(obj.event, {
    ...defaultMapping,
    ...config.mapping,
  });

  const { settings, data, ignore, name } = mapping;
  const eventName = isDefined(name)
    ? name
    : `${config.prefix} ${obj.event.replace(/ /g, '_')}`;

  if (ignore) return;

  // Command
  if (settings?.command) {
    const data = await getMappingValue(obj, settings.command);
    return data ? { command: { name: eventName, data } } : undefined;
  }

  // Mapping values
  const values = data ? await getMappingValue(obj, data) : {};

  // id for duplicate detection
  const id = obj.id ? String(obj.id) : getId();

  const event: WalkerOS.DeepPartialEvent & { id: string } = {
    id,
    data: obj as WalkerOS.Properties,
    ...(isObject(values) ? values : {}),
    event: eventName, // Update the event name
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

  // source type is dataLayer
  event.source = event.source ?? {};
  event.source.type = event.source.type ?? 'dataLayer';

  return { event };
}

// https://developers.google.com/tag-platform/gtagjs/reference
export function gtagToObj(args: IArguments): void | WalkerOS.AnyObject {
  const [command, value, params] = Array.from(args);

  if (isObject(command)) return command;

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
