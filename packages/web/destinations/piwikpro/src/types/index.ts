import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

declare global {
  interface Window {
    _paq?: Array<unknown>;
  }
}

export interface Settings {
  appId: string;
  linkTracking?: boolean;
  url: string;
}

export type InitSettings = Partial<Settings>;

export interface Mapping {
  goalId?: string;
  goalValue?: string;
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

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;

export interface Dimensions {
  [i: number]: string;
}
