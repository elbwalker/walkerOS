import type { WalkerOS } from '@walkerOS/core';
import type { Include, Parameters } from '../types';

export function getParamsInclude(
  event: WalkerOS.DeepPartialEvent,
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
    let group = event[groupName as keyof Omit<WalkerOS.Event, 'all'>] || {};

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
