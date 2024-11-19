import type { Mapping, WalkerOS } from '@elbwalker/types';
import { castToProperty, getByPath, getGrantedConsent, isDefined } from '.';

export function getEventMapping(
  event: string,
  mapping?: Mapping.Config<unknown>,
): Mapping.EventMapping {
  const [entity, action] = event.split(' ');
  if (!entity || !action) return {};

  // Check for an active mapping for proper event handling
  let eventMapping: undefined | Mapping.Event;
  let mappingKey = '';

  if (mapping) {
    let mappingEntityKey = entity; // Default key is the entity name
    let mappingEntity = mapping[mappingEntityKey];

    if (!mappingEntity) {
      // Fallback to the wildcard key
      mappingEntityKey = '*';
      mappingEntity = mapping[mappingEntityKey];
    }

    if (mappingEntity) {
      let mappingActionKey = action; // Default action is the event action
      eventMapping = mappingEntity[mappingActionKey];

      if (!eventMapping) {
        // Fallback to the wildcard action
        mappingActionKey = '*';
        eventMapping = mappingEntity[mappingActionKey];
      }

      // Handle individual event settings
      if (eventMapping) {
        // Save the mapping key for later use
        mappingKey = `${mappingEntityKey} ${mappingActionKey}`;
      }
    }
  }

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

    const { condition, consent, fn, key, validate, value } =
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

    // Validate the value
    if (validate && !validate(mappingValue)) {
      mappingValue = undefined;
    }

    const property = castToProperty(mappingValue);

    // Finally, check and convert the type
    return isDefined(property) ? property : value; // Always use value as a fallback
  }, undefined as WalkerOS.Property | undefined);
}
