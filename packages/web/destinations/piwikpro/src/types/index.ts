import type { Mapping as WalkerOSMapping, Elb } from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

declare global {
  // Augment the global WalkerOS namespace with destination-specific types
  namespace WalkerOS {
    interface Elb extends Elb.RegisterDestination<Destination, Config> {}
  }

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
export type Rules = WalkerOSMapping.Rules<Rule>;

export interface Dimensions {
  [i: number]: string;
}
