import { WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    _paq?: Function; // @TODO types
  }
}

export declare namespace DestinationPiwikPro {
  interface Function
    extends WebDestination.Function<CustomConfig, CustomEventConfig> {}

  type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

  interface CustomConfig {
    // custom settings
  }

  interface CustomEventConfig {
    // Custom destination event mapping properties
  }
}
