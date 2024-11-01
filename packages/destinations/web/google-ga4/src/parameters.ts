import type { WalkerOS } from '@elbwalker/types';
import type { GtagItems, Include, Parameters, Params } from './types';
import { getMappingValue } from '@elbwalker/utils';

export function getParams(event: WalkerOS.Event, mapping: Params): Parameters {
  const params = Object.entries(mapping).reduce((acc, [key, mapping]) => {
    const value = getMappingValue(event, mapping);
    if (value) acc[key] = value;
    return acc;
  }, {} as Parameters);

  return params;
}

export function getParamsInclude(
  event: WalkerOS.Event,
  include: Include,
): Parameters {
  const params: Parameters = {};

  // Check for the 'all' group to add each group
  if (include.includes('all'))
    include = [
      'context',
      'data',
      'event',
      'globals',
      'source',
      'user',
      'version',
    ];

  include.forEach((groupName) => {
    let group = event[groupName as keyof Omit<WalkerOS.Event, 'all'>];

    // Create a fake group for event properties
    if (groupName == 'event')
      group = {
        id: event.id,
        timing: event.timing,
        trigger: event.trigger,
        entity: event.entity,
        action: event.action,
        group: event.group,
        count: event.count,
      };

    Object.entries(group).forEach(([key, val]) => {
      // Different value access for context
      if (groupName == 'context') val = (val as WalkerOS.OrderedProperties)[0];

      params[`${groupName}_${key}`] = val;
    });
  });

  return params;
}

export function getParamsItems(
  event: WalkerOS.Event,
  mapping: Params,
): Parameters {
  let itemsCount = 0; // This will become the total items
  const params = Object.entries(mapping).reduce((acc, [key, mapping]) => {
    const value = getMappingValue(event, mapping);
    if (value) {
      itemsCount = itemsCount || 1;
      // Define the number of items based on the longest array
      if (Array.isArray(value) && value.length > itemsCount)
        itemsCount = value.length;

      acc[key] = value;
    }

    return acc;
  }, {} as Parameters);

  const items: GtagItems = [];
  for (let i = 0; i < itemsCount; i++) {
    const item = (items[i] = {} as Gtag.Item);
    Object.entries(params).forEach(([key, paramValue]) => {
      const value = Array.isArray(paramValue) ? paramValue[i] : paramValue;
      if (value) item[key as keyof Gtag.Item] = value;
    });
  }

  return items.length ? { items } : {};
}
