import type { Mapping } from '@walkerOS/types';
import type { DestinationWeb } from '@walkerOS/web-collector';

declare global {
  interface Window {
    dataLayer: Array<unknown> | unknown;
    gtag?: Gtag.Gtag;
  }
}

export interface Destination
  extends DestinationWeb.Destination<Custom, CustomEvent> {}

export type Config = DestinationWeb.Config<Custom, CustomEvent>;

export interface Custom {
  conversionId?: string; // The ads accounts id used for every conversion
  currency?: string; // Default currency is EUR
}

export type EventConfig = Mapping.EventConfig<CustomEvent>;

export interface CustomEvent {}
