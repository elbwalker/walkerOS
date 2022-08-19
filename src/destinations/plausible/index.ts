import { Elbwalker, WebDestination } from '@elbwalker/types';

declare global {
  interface Window {
    plausible?: any;
  }
}

const w = window;

export interface DestinationPlausible extends WebDestination.Function {
  config: WebDestination.Config & {
    apiHost?: string;
    domain?: string;
    scriptLoad?: boolean;
  };
}

export const destination: DestinationPlausible = {
  config: {},

  init() {
    let config = this.config;

    if (config.scriptLoad) addScript(config.domain);

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

function addScript(domain?: string, src = 'https://plausible.io/js/script.js') {
  const script = document.createElement('script');
  script.src = src;
  if (domain) script.dataset.domain = domain;
  document.head.appendChild(script);
}

export default destination;
