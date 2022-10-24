import { IElbwalker, WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    xxx?: Function; // global window objects
  }
}

const w = window;

export namespace DestinationXXX {
  export interface Config extends WebDestination.Config {
    custom?: {
      // XXXs custom settings
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

export const destination: DestinationXXX.Function = {
  config: {},

  init() {
    let config = this.config;

    if (config.loadScript) addScript();

    // Do something initializing

    return true;
  },

  push(
    event: IElbwalker.Event,
    mapping: DestinationXXX.EventConfig = {},
  ): void {
    // Do something magical
  },
};

function addScript(src = 'https://XXX_DOMAIN/xxx.js') {
  const script = document.createElement('script');
  script.src = src;
  document.head.appendChild(script);
}

export default destination;
