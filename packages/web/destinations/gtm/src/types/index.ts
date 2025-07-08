import type { Mapping } from '@walkerOS/types';
import type { DestinationWeb } from '@walkerOS/web-collector';

declare global {
  interface Window {
    dataLayer: Array<unknown> | unknown;
  }
}

export type Destination = DestinationWeb.Destination<Settings, EventMapping>;
export type Config = DestinationWeb.Config<Settings, EventMapping>;

// Destination-specific settings (internal usage)
export interface Settings {
  containerId?: string; // GTM-XXXXXXX
  dataLayer?: string; // dataLayer
  domain?: string; // Source domain of the GTM
}

// Single event transformation rule
export interface EventMapping {}

export type EventConfig = Mapping.EventConfig<EventMapping>;
