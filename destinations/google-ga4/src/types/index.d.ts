import { WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    gtag: Gtag.Gtag;
  }
}

export declare namespace DestinationGoogleGA4 {
  interface Function
    extends WebDestination.Function<CustomConfig, CustomEventConfig> {}

  type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

  interface CustomConfig {
    debug?: boolean;
    measurementId: string;
    properties?: PropertyMapping;
    transport_url?: string;
  }

  interface CustomEventConfig {
    properties?: PropertyMapping;
  }

  interface PropertyMapping {
    [key: string]: string; // @TODO or object with default
  }
}
