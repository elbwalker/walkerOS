import type { Mapping } from '@walkerOS/types';
import type { DestinationWeb } from '@walkerOS/web-collector';

declare global {
  interface Window {
    dataLayer: Array<unknown> | unknown;
    gtag?: Gtag.Gtag;
  }
}

export type Destination = DestinationWeb.Destination<Settings, EventMapping>;
export type Config = DestinationWeb.Config<Settings, EventMapping>;

// Destination-specific settings (internal usage)
export interface Settings {
  conversionId?: string; // The ads accounts id used for every conversion
  currency?: string; // Default currency is EUR
}

// Single event transformation rule
export interface EventMapping {}

export type EventConfig = Mapping.EventConfig<EventMapping>;
