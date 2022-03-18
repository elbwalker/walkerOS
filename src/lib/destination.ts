import { Destination } from '../types/destination';
import { Elbwalker } from '../types/elbwalker';

export const destination: Destination.Function = {
  init(): void {
    window.dataLayer = window.dataLayer || [];
  },

  push(event: Elbwalker.Event): void {
    window.dataLayer!.push({
      ...event,
      walker: true,
    });
  },
  mapping: false,
};
