import { Elbwalker, WebDestination } from '@elbwalker/types';

export const destination: WebDestination.Function = {
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
