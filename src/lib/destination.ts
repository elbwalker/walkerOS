import { Destination, Event } from '../types/elbwalker';

export const destination: Destination = {
  init(): void {
    window.dataLayer = window.dataLayer || [];
  },

  push(event: Event): void {
    window.dataLayer!.push({
      event: `${event.entity} ${event.action}`,
      entity: event.entity,
      action: event.action,
      data: event.data,
      trigger: event.trigger,
      nested: event.nested,
      elbwalker: true,
    });
  },
  mapping: false,
};
