import type { Mapping as WalkerOSMapping } from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

declare global {
  interface Window {
    _paq?: Array<unknown>;
  }
}

export interface Env extends DestinationWeb.Env {
  window: {
    _paq: Array<unknown>;
  };
  document: {
    createElement: (tagName: string) => {
      type: string;
      src: string;
      async?: boolean;
      defer?: boolean;
    };
    head: {
      appendChild: (node: unknown) => void;
    };
  };
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
