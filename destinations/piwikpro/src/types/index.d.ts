import { WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    _paq?: Array<unknown>;
  }
}

export declare namespace DestinationPiwikPro {
  interface Function
    extends WebDestination.Function<CustomConfig, CustomEventConfig> {}

  type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

  interface CustomConfig {
    appId: string;
    // @TODO pageview?: boolean;
    url: string;
    // @TODO useTagManager?: boolean
  }

  interface CustomEventConfig {
    // Custom destination event mapping properties
  }
}
