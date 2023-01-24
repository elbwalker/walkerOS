import { IElbwalker, WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {}
}

const w = window;

export namespace DestinationAPI {
  export interface Config extends WebDestination.Config {
    custom?: {
      url?: string;
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
    // Do something initializing

    return true;
  },

  push(
    event: IElbwalker.Event,
    config: DestinationAPI.Config = {},
    mapping: DestinationAPI.EventConfig = {},
  ): void {
    const custom = config.custom || {};

    if (!custom.url) return;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', custom.url, true);
    xhr.setRequestHeader('Content-type', 'text/plain; charset=utf-8');
    xhr.send(JSON.stringify(event));
  },
};

export default destination;
