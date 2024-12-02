import type { Mapping, WalkerOS } from '@elbwalker/types';
import { castToProperty, getByPath, getGrantedConsent, isDefined } from '.';

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
    eventMapping = Array.isArray(eventMapping) ? eventMapping : [eventMapping];

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
  event: WalkerOS.PartialEvent,
  mapping: Mapping.Value,
  instance?: WalkerOS.Instance,
  props?: unknown,
): WalkerOS.Property | undefined {
  // Ensure mapping is an array for uniform processing
  const mappings = Array.isArray(mapping) ? mapping : [mapping];

  // Loop over each mapping and return the first valid result
  return mappings.reduce((acc, mappingItem) => {
    if (acc) return acc; // A valid result was already found

    const { condition, consent, fn, key, map, validate, value } =
      typeof mappingItem == 'string'
        ? ({ key: mappingItem } as Mapping.ValueConfig)
        : mappingItem;

    // Check if this mapping should be used
    if (condition && !condition(event, mappingItem, instance)) return;

    // Check if consent is required and granted
    if (consent && !getGrantedConsent(consent, instance?.consent)) return value;

    let mappingValue;
    if (fn) {
      // Use a custom function to get the value
      mappingValue = fn(event, mappingItem, instance, props);
    } else {
      // Get dynamic value from the event
      mappingValue = getByPath(event, key, value);
    }

    if (map) {
      mappingValue = Object.entries(map).reduce(
        (mappedObj, [mapKey, mapValue]) => {
          const result = getMappingValue(event, mapValue, instance, props);
          if (isDefined(result)) mappedObj[mapKey] = result;

          return mappedObj;
        },
        {} as WalkerOS.AnyObject,
      );
    }

    // Validate the value
    if (validate && !validate(mappingValue)) {
      mappingValue = undefined;
    }

    const property = castToProperty(mappingValue);

    // Finally, check and convert the type
    return isDefined(property) ? property : value; // Always use value as a fallback
  }, undefined as WalkerOS.Property | undefined);
}
