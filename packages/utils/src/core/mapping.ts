import type { Mapping, WalkerOS } from '@elbwalker/types';
import { getGrantedConsent } from './consent';
import { getByPath } from './byPath';
import { isArray, isDefined, isString } from './is';
import { castToProperty } from './property';

export function getMappingEvent(
  event: WalkerOS.PartialEvent,
  mapping?: Mapping.Config<unknown>,
): Mapping.EventMapping {
  const [entity, action] = (event.event || '').split(' ');
  if (!mapping || !entity || !action) return {};

  let eventMapping: Mapping.EventConfig | undefined;
  let mappingKey = '';
  let entityKey = entity;
  let actionKey = action;

  const resolveEventMapping = (
    eventMapping?:
      | Mapping.EventConfig<unknown>
      | Mapping.EventConfig<unknown>[],
  ) => {
    if (!eventMapping) return;
    eventMapping = isArray(eventMapping) ? eventMapping : [eventMapping];

    return eventMapping.find(
      (eventMapping) =>
        !eventMapping.condition || eventMapping.condition(event),
    );
  };

  if (!mapping[entityKey]) entityKey = '*';
  const entityMapping = mapping[entityKey];

  if (entityMapping) {
    if (!entityMapping[actionKey]) actionKey = '*';
    eventMapping = resolveEventMapping(entityMapping[actionKey]);
  }

  // Fallback to * *
  if (!eventMapping) {
    entityKey = '*';
    actionKey = '*';
    eventMapping = resolveEventMapping(mapping[entityKey]?.[actionKey]);
  }

  if (eventMapping) mappingKey = `${entityKey} ${actionKey}`;

  return { eventMapping, mappingKey };
}

export function getMappingValue(
  value: WalkerOS.DeepPartialEvent | unknown | undefined,
  data: Mapping.Data = {},
  options: Mapping.Options = {},
): WalkerOS.Property | undefined {
  if (!isDefined(value)) return;

  const mappings = isArray(data) ? data : [data];

  for (const mapping of mappings) {
    const result = processMappingValue(value, mapping, options);
    if (isDefined(result)) return result;
  }
}

function processMappingValue(
  value: WalkerOS.DeepPartialEvent | unknown,
  mapping: Mapping.Value,
  options: Mapping.Options = {},
): WalkerOS.Property | undefined {
  const { instance } = options;

  // Ensure mapping is an array for uniform processing
  const mappings = isArray(mapping) ? mapping : [mapping];

  // Loop over each mapping and return the first valid result
  return mappings.reduce((acc, mappingItem) => {
    if (acc) return acc; // A valid result was already found

    const mapping = isString(mappingItem) ? { key: mappingItem } : mappingItem;

    const {
      condition,
      consent,
      fn,
      key,
      loop,
      map,
      set,
      validate,
      value: staticValue,
    } = mapping;

    // Check if this mapping should be used
    if (condition && !condition(value, mappingItem, instance)) return;

    // Check if consent is required and granted
    if (consent && !getGrantedConsent(consent, instance?.consent))
      return staticValue;

    let mappingValue: unknown = staticValue || value;

    if (fn) {
      // Use a custom function to get the value
      mappingValue = fn(value, mappingItem, options);
    }

    if (key) {
      // Get dynamic value from the event
      mappingValue = getByPath(value, key, staticValue);
    }

    if (loop) {
      const [scope, itemMapping] = loop;

      const data =
        scope === 'this' ? [value] : getMappingValue(value, scope, options);

      if (isArray(data)) {
        mappingValue = data
          .map((item) => getMappingValue(item, itemMapping, options))
          .filter(isDefined);
      }
    } else if (map) {
      mappingValue = Object.entries(map).reduce(
        (mappedObj, [mapKey, mapValue]) => {
          const result = getMappingValue(value, mapValue, options);
          if (isDefined(result)) mappedObj[mapKey] = result;

          return mappedObj;
        },
        {} as WalkerOS.AnyObject,
      );
    } else if (set) {
      mappingValue = set.map((item) =>
        processMappingValue(value, item, options),
      );
    }

    // Validate the value
    if (validate && !validate(mappingValue)) mappingValue = undefined;

    const property = castToProperty(mappingValue);

    // Finally, check and convert the type
    return isDefined(property) ? property : castToProperty(staticValue); // Always use value as a fallback
  }, undefined as WalkerOS.Property | undefined);
}
