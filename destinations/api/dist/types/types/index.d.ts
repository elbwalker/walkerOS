import { WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {}
}

export namespace DestinationAPI {
  export interface Config extends WebDestination.Config {
    custom?: {
      url?: string;
      transport?: Transport;
    };
    mapping?: WebDestination.Mapping<EventConfig>;
  }

  export interface Function extends WebDestination.Function {
    config: Config;
  }

  export interface EventConfig extends WebDestination.EventConfig {
    // Custom destination event mapping properties
  }

  type Transport = 'fetch' | 'xhr';
}
