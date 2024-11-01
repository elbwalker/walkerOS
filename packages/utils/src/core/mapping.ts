import type { Destination, WalkerOS } from '@elbwalker/types';
import { castToProperty, getByStringDot } from '.';

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
  const { fn, key, value } =
    typeof mapping == 'string'
      ? ({ key: mapping } as WalkerOS.MappingValueObject)
      : mapping;

  let mappingValue;
  if (fn) {
    mappingValue = fn(event, mapping, instance);
  } else {
    mappingValue = getByStringDot(event, key, value);
  }

  return castToProperty(mappingValue);
}
