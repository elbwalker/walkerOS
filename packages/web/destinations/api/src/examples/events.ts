import { getEvent } from '@walkerOS/core';

export function entity_action() {
  const event = getEvent('entity action');

  return JSON.stringify(event.data);
}
