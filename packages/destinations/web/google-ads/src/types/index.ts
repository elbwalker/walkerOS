import type { WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    dataLayer: Array<unknown> | unknown;
    gtag?: Gtag.Gtag;
  }
}

export interface Destination
  extends WebDestination.Destination<Custom, CustomEvent> {}

export type Config = WebDestination.Config<Custom, CustomEvent>;

export interface Custom {
  conversionId?: string; // The ads accounts id used for every conversion
  currency?: string; // Default currency is EUR
  defaultValue?: number; // Used default value for conversions
}

export interface CustomEvent {
  id?: string; // Name of data property key to use as transaction id
  label?: string; // Conversion label
  value?: string; // Name of data property key to use for value}
}
