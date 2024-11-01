import type { Destination, WalkerOS } from '@elbwalker/types';
import { castToProperty, getByStringDot, getGrantedConsent } from '.';

export function getEventConfig(
  event: string,
  mapping?: Destination.Mapping<unknown>,
) {
  const [entity, action] = event.split(' ');
  if (!entity || !action) return {};

  // Check for an active mapping for proper event handling
  let eventConfig: undefined | Destination.EventConfig;
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
      eventConfig = mappingEntity[mappingActionKey];

      if (!eventConfig) {
        // Fallback to the wildcard action
        mappingActionKey = '*';
        eventConfig = mappingEntity[mappingActionKey];
      }

      // Handle individual event settings
      if (eventConfig) {
        // Save the mapping key for later use
        mappingKey = `${mappingEntityKey} ${mappingActionKey}`;
      }
    }
  }

  return { eventConfig, mappingKey };
}

export function getMappingValue(
  event: WalkerOS.Event,
  mapping: WalkerOS.MappingValue,
  instance?: WalkerOS.Instance,
): WalkerOS.Property | undefined {
  const { consent, fn, key, validate, value } =
    typeof mapping == 'string'
      ? ({ key: mapping } as WalkerOS.MappingValueObject)
      : mapping;

  // Check if consent is required and granted
  if (consent && !getGrantedConsent(consent, instance?.consent)) return value;

  let mappingValue;
  if (fn) {
    // Use a custom function to get the value
    mappingValue = fn(event, mapping, instance);
  } else {
    // Get dynamic value from the event
    mappingValue = getByStringDot(event, key);
  }

  // Validate the value
  if (validate && !validate(mappingValue)) {
    mappingValue = undefined;
  }

  // Finally, check and convert the type
  return castToProperty(mappingValue) || value; // Always use value as a fallback
}
