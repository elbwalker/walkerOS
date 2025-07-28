import { getEvent } from '@walkeros/core';

export function entity_action() {
  const event = getEvent('entity action');

  return JSON.stringify(event.data);
}
