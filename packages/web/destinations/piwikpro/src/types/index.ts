import type { Mapping } from '@walkerOS/types';
import type { DestinationWeb } from '@walkerOS/web-collector';

declare global {
  interface Window {
    _paq?: Array<unknown>;
  }
}

export type Destination = DestinationWeb.Destination<Settings, EventMapping>;
export type Config = DestinationWeb.Config<Settings, EventMapping>;

// Destination-specific settings (internal usage)
export interface Settings {
  appId: string;
  // dimensions?: Dimensions;
  linkTracking?: boolean;
  url: string;
}

// Single event transformation rule
export interface EventMapping {
  // dimensions?: Dimensions;
  goalId?: string;
  goalValue?: string;
}

export type EventConfig = Mapping.EventConfig<EventMapping>;

export interface Dimensions {
  [i: number]: string;
}
