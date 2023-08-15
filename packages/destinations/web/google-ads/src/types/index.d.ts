import { WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    gtag?: Gtag.Gtag;
  }
}

export declare namespace DestinationGoogleAds {
  interface Function
    extends WebDestination.Function<CustomConfig, CustomEventConfig> {}

  type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

  interface CustomConfig {
    conversionId?: string; // The ads accounts id used for every conversion
    currency?: string; // Default currency is EUR
    defaultValue?: number; // Used default value for conversions
  }

  interface CustomEventConfig {
    id?: string; // Name of data property key to use as transaction id
    label?: string; // Conversion label
    value?: string; // Name of data property key to use for value}
  }
}
