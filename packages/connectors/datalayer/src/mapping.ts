import type { WalkerOS } from '@elbwalker/types';
import type { Config, EventMappingValues, Value } from './types';
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

    if (mapping.data)
      event.data = mapEntries<WalkerOS.Properties>(obj, mapping.data);
    if (mapping.globals)
      event.globals = mapEntries<WalkerOS.Properties>(obj, mapping.globals);
    if (mapping.custom)
      event.custom = mapEntries<WalkerOS.Properties>(obj, mapping.custom);
    if (mapping.user)
      event.user = mapEntries<WalkerOS.Properties>(obj, mapping.user);
    if (mapping.consent)
      event.consent = mapEntries<WalkerOS.Consent>(obj, mapping.consent, true);
    if (mapping.version)
      event.version = mapEntries<WalkerOS.Version>(obj, mapping.version);
    if (mapping.source)
      event.source = mapEntries<WalkerOS.Source>(obj, mapping.source);
  }

  // Update the event name
  event.event = eventName;

  // source type is dataLayer
  event.source = event.source ?? {};
  event.source.type = event.source.type ?? 'dataLayer';

  return event;
}

type MappedProperties<T> = T extends WalkerOS.Consent
  ? WalkerOS.Consent
  : WalkerOS.Properties;
function mapEntries<T>(
  obj: WalkerOS.AnyObject,
  mapping: Record<string, Value | undefined>,
  isConsent = false,
): MappedProperties<T> {
  return Object.entries(mapping).reduce((acc, [key, value]) => {
    if (value) {
      acc[key] = isConsent
        ? !!getMappingValue(obj, value)
        : getMappingValue(obj, value);
    }
    return acc;
  }, {} as MappedProperties<T>);
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
