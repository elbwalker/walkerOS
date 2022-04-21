import { Elbwalker, WebDestination } from '@elbwalker/types';

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export const destination: WebDestination.Function = {
  config: {},

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
};

export default destination;
