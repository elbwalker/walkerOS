import { Elbwalker, WebDestination } from '@elbwalker/types';

declare global {
  interface Window {
    plausible?: any;
  }
}

const w = window;

export interface DestinationPlausible extends WebDestination.Function {
  config: WebDestination.Config & {
    domain?: string;
    apiHost?: string;
  };
}

export const destination: WebDestination.Function = {
  config: {},

  init() {
    w.plausible =
      w.plausible ||
      function () {
        (w.plausible!.q = w.plausible!.q || []).push(arguments);
      };

    return true;
  },

  push(event: Elbwalker.Event): void {
    w.plausible(`${event.event}`);
  },
};

export default destination;
