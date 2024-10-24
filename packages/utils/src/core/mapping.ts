import type { Destination, WalkerOS } from '@elbwalker/types';
import { castToProperty, getByStringDot } from '.';

interface MappingObject {
  key?: string;
  defaultValue?: WalkerOS.PropertyType;
}

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

// @TODO stringDot for event values like timing, id, etc
export function getMappingValue(
  event: WalkerOS.Event,
  mapping: WalkerOS.MappingValue,
): WalkerOS.Property | undefined {
  const obj = getMappingObject(mapping);
  if (obj.key)
    return castToProperty(getByStringDot(event, obj.key, obj.defaultValue));

  return obj.defaultValue;
}

function getMappingObject(param: WalkerOS.MappingValue): MappingObject {
  let key: string | undefined;
  let defaultValue: WalkerOS.PropertyType | undefined;

  if (typeof param == 'string') {
    key = param;
  } else {
    key = param.key;
    defaultValue = param.default;
  }

  return { key, defaultValue };
}
