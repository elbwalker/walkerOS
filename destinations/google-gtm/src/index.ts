import { Elbwalker, WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export interface DestinationGTM extends WebDestination.Function {}

export const destination: DestinationGTM = {
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
