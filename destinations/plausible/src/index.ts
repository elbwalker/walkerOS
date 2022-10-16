import { IElbwalker, WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    plausible?: any;
  }
}

const w = window;

export namespace DestinationPlausible {
  export interface Config extends WebDestination.Config {
    custom?: {
      domain?: string; // Name of the domain to be tracked
    };
    mapping?: WebDestination.Mapping<EventConfig>;
  }

  export interface Function extends WebDestination.Function {
    config: Config;
  }

  export interface EventConfig extends WebDestination.EventConfig {
    // Custom destination event mapping properties
  }

  export type ExclusionParameters = string[];
}

export const destination: DestinationPlausible.Function = {
  config: {},

  init() {
    let config = this.config;
    config.custom = config.custom || {};

    if (config.loadScript) addScript(config.custom.domain);

    w.plausible =
      w.plausible ||
      function () {
        (w.plausible!.q = w.plausible!.q || []).push(arguments);
      };

    return true;
  },

  push(event: IElbwalker.Event): void {
    w.plausible(`${event.event}`, { props: event.data });
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
