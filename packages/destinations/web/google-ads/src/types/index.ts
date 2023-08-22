import { WebDestination } from '@elbwalker/types';

declare global {
  interface Window {
    gtag?: Gtag.Gtag;
    dataLayer: Array<unknown>;
  }
}

export interface Function
  extends WebDestination.Function<CustomConfig, CustomEventConfig> {}

export type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

export interface CustomConfig {
  conversionId?: string; // The ads accounts id used for every conversion
  currency?: string; // Default currency is EUR
  defaultValue?: number; // Used default value for conversions
}

export interface CustomEventConfig {
  id?: string; // Name of data property key to use as transaction id
  label?: string; // Conversion label
  value?: string; // Name of data property key to use for value}
}
