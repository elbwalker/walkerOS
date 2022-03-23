import { Destination } from '../types/destination';
import { Elbwalker } from '../types/elbwalker';

export const destination: Destination.Function = {
  init() {
    window.dataLayer = window.dataLayer || [];

    return true;
  },

  push(event: Elbwalker.Event): void {
    window.dataLayer!.push({
      ...event,
      walker: true,
    });
  },

  config: {},
};
