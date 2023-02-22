import { Walker, WebDestination } from '@elbwalker/walker.js';

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
    items?: ItemsConfig;
    measurementId: string;
    pageview?: boolean;
    params?: PropertyMapping;
    transport_url?: string;
  }

  interface CustomEventConfig {
    items?: ItemsConfig;
    params?: PropertyMapping;
  }

  interface ItemsConfig {
    params?: PropertyMapping;
  }

  interface PropertyMapping {
    [key: string]: string | PropertyMappingValue;
  }

  interface PropertyMappingValue {
    key: string;
    default?: Walker.PropertyType;
  }

  type Items = Gtag.Item[];
  type Parameters = Gtag.ControlParams & Gtag.EventParams & Gtag.CustomParams;
}
