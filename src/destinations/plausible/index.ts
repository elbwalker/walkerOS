import { Elbwalker, WebDestination } from '../../types';

declare global {
  interface Window {
    plausible?: any;
  }
}

const w = window;

export interface DestinationPlausible extends WebDestination.Function {
  config: WebDestination.Config & {
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
    // page view event
    if (event.event === 'page view') {
      w.plausible('pageview');
    } else {
      w.plausible(`${event.event}`, { props: event.data });
    }
  },
};

function addScript(
  domain?: string,
  src = 'https://plausible.io/js/script.manual.js',
) {
  const script = document.createElement('script');
  script.src = src;
  if (domain) script.dataset.domain = domain;
  document.head.appendChild(script);
}

export default destination;
