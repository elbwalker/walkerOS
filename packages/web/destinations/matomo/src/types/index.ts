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

/** Bare dimension id (like "1") to a Mapping Value resolved per event. */
export type CustomDimensions = Record<string, WalkerOSMapping.Value>;

export interface Settings {
  /** Matomo Site ID; required when `loadScript` is true. */
  siteId?: string;
  /** Base URL of the Matomo instance, like https://analytics.example.com/; required when `loadScript` is true. */
  url?: string;
  /** Disable all tracking cookies for cookie-free analytics. */
  disableCookies?: boolean;
  /** Enable automatic outlink and download tracking. Default: true. */
  enableLinkTracking?: boolean;
  /** Enable heart beat timer with interval in seconds for accurate time-on-page. */
  enableHeartBeatTimer?: number;
  /** Custom dimensions applied to every hit, keyed by bare dimension id. */
  customDimensions?: CustomDimensions;
}

export type InitSettings = Partial<Settings>;

export interface Mapping {
  /** Goal ID to track a conversion alongside this event. */
  goalId?: string;
  /** Goal revenue, resolved from the event (like "data.revenue"). */
  goalValue?: WalkerOSMapping.Value;
  /** Track as internal site search via trackSiteSearch. */
  siteSearch?: boolean;
  /** Track as content impression via trackContentImpression. */
  contentImpression?: boolean;
  /** Track as content interaction via trackContentInteraction. */
  contentInteraction?: boolean;
  /** Custom dimensions for this rule; win per key over the destination ones. */
  customDimensions?: CustomDimensions;
}

export interface Env extends DestinationWeb.Env {
  window: {
    // Optional: the queue may be absent until `init` installs it.
    _paq?: Array<unknown>;
    location?: { href?: string };
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
