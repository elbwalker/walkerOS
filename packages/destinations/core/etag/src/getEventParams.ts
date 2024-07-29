import type { WalkerOS } from '@elbwalker/types';
import type { ParametersEvent, State } from './types';

export function getEventParams(
  event: WalkerOS.Event,
  state: State,
  paramsEvent: Partial<ParametersEvent> = {},
): ParametersEvent {
  // Event Parameters
  const eventParams: ParametersEvent = {
    en: event.event, // Event name
    _et: getEngagementTime(state.lastEngagement), // Time between now and the previous event
    ...paramsEvent,
  };

  state.lastEngagement = Date.now();

  // Enhanced Measurement Flag
  if (event.trigger == 'etag') eventParams._ee = 1;

  const include: Array<keyof WalkerOS.Event> = [
    'context',
    'data',
    'event',
    'globals',
    'source',
    'user',
    'version',
  ];

  include.forEach((groupName) => {
    let group = event[groupName];

    if (!group) return;

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

      const type = typeof val === 'number' ? 'epn' : 'ep';
      const paramKey: keyof ParametersEvent = `${type}.${groupName}_${key}`;
      if (val) eventParams[paramKey] = val as never;
    });
  });

  return eventParams;
}

function getEngagementTime(lastEngagement: number): number {
  const lastEvent = lastEngagement
    ? Math.floor(Date.now() - (lastEngagement || 1))
    : 1;

  return lastEvent || 1;
}
