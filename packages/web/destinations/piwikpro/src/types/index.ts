import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
  WalkerOS,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

declare global {
  interface Window {
    _paq?: Array<unknown>;
  }
}

/** Bare dimension id (like "1") to a Mapping Value resolved per event. */
export type CustomDimensions = Record<string, WalkerOSMapping.Value>;

export interface Settings {
  /** Piwik PRO site id; required when `loadScript` is true. */
  appId?: string;
  /** Automatic outlink and download tracking after the first hit. Default: true */
  linkTracking?: boolean;
  /** Piwik PRO account URL; required when `loadScript` is true. */
  url?: string;
  /** Custom dimensions applied to every hit, keyed by bare dimension id. */
  customDimensions?: CustomDimensions;
  /** Identified (default) or anonymous tracking; a consent object identifies when granted. */
  identified?: boolean | WalkerOS.Consent;
}

export type InitSettings = Partial<Settings>;

export interface Mapping {
  /** Piwik PRO goal id (UUID or legacy integer); adds a trackGoal hit. */
  goalId?: string | number;
  /** Goal revenue, resolved from the event (like "data.total"). */
  goalValue?: WalkerOSMapping.Value;
  /** Custom dimensions for this rule; win per key over the destination ones. */
  customDimensions?: CustomDimensions;
}

export interface Env extends DestinationWeb.Env {
  window: {
    // Optional: the SDK queue may be absent until `init` installs it.
    _paq?: Array<unknown>;
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
