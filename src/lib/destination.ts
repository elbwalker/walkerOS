import { Destination } from '../types/destination';
import { Elbwalker } from '../types/elbwalker';

export const destination: Destination.Function = {
  init(): void {
    window.dataLayer = window.dataLayer || [];
  },

  push(event: Elbwalker.Event): void {
    window.dataLayer!.push({
      event: `${event.entity} ${event.action}`,
      entity: event.entity,
      action: event.action,
      data: event.data,
      globals: event.globals,
      trigger: event.trigger,
      nested: event.nested,
      group: event.group,
      elbwalker: true,
    });
  },
  mapping: false,
};
