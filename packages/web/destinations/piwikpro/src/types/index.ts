import type { Mapping as WalkerOSMapping } from '@walkerOS/types';
import type { DestinationWeb } from '@walkerOS/web-collector';

declare global {
  interface Window {
    _paq?: Array<unknown>;
  }
}

export type Destination = DestinationWeb.Destination<Settings, Mapping>;
export type Config = DestinationWeb.Config<Settings, Mapping>;

// Destination-specific settings (internal usage)
export interface Settings {
  appId: string;
  // dimensions?: Dimensions;
  linkTracking?: boolean;
  url: string;
}

// Single event transformation rule
export interface Mapping {
  // dimensions?: Dimensions;
  goalId?: string;
  goalValue?: string;
}

export type Rule = WalkerOSMapping.Rule<Mapping>;

export interface Dimensions {
  [i: number]: string;
}
