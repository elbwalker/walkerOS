import { IElbwalker, WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    xxx?: Function; // global window objects
  }
}

const w = window;

export namespace DestinationAPI {
  export interface Config extends WebDestination.Config {
    custom?: {
      // APIs custom settings
    };
    mapping?: WebDestination.Mapping<EventConfig>;
  }

  export interface Function extends WebDestination.Function {
    config: Config;
  }

  export interface EventConfig extends WebDestination.EventConfig {
    // Custom destination event mapping properties
  }
}

export const destination: DestinationAPI.Function = {
  config: {},

  init(config: DestinationAPI.Config) {
    if (config.loadScript) addScript();

    // Do something initializing

    return true;
  },

  push(
    event: IElbwalker.Event,
    config?: DestinationAPI.Config,
    mapping: DestinationAPI.EventConfig = {},
  ): void {
    // Do something magical
  },
};

function addScript(src = 'https://API_DOMAIN/xxx.js') {
  const script = document.createElement('script');
  script.src = src;
  document.head.appendChild(script);
}

export default destination;
