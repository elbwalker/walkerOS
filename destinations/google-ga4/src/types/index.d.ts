import { WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    gtag: Function;
  }
}

export declare namespace DestinationGoogleGA4 {
  interface Function
    extends WebDestination.Function<CustomConfig, CustomEventConfig> {}

  type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

  interface CustomConfig {
    debug?: boolean;
    measurementId: string;
    transport_url?: string;
  }

  interface CustomEventConfig {}
}
