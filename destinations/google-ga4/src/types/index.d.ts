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
    items?: Items;
    measurementId: string;
    params?: PropertyMapping;
    transport_url?: string;
  }

  interface CustomEventConfig {
    items?: Items;
    params?: PropertyMapping;
  }

  interface Items {
    params?: PropertyMapping;
  }

  interface PropertyMapping {
    [key: string]: string; // @TODO or object with default
  }
}
