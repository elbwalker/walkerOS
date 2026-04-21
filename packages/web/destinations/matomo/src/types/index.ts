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
  /** Matomo Site ID (required). */
  siteId: string;
  /** Base URL of Matomo instance, e.g. https://analytics.example.com/ (required). */
  url: string;
  /** Disable all tracking cookies for cookie-free analytics. */
  disableCookies?: boolean;
  /** Enable automatic outlink and download tracking. Default: true. */
  enableLinkTracking?: boolean;
  /** Enable heart beat timer with interval in seconds for accurate time-on-page. */
  enableHeartBeatTimer?: number;
  /** Custom dimensions applied to all events. Keys are dimension IDs, values are property paths. */
  customDimensions?: Record<string, string>;
}

export type InitSettings = Partial<Settings>;

export interface Mapping {
  /** Goal ID to track a conversion alongside this event. */
  goalId?: string;
  /** Property path for goal revenue value (e.g. data.revenue). */
  goalValue?: string;
  /** Track as internal site search via trackSiteSearch. */
  siteSearch?: boolean;
  /** Track as content impression via trackContentImpression. */
  contentImpression?: boolean;
  /** Track as content interaction via trackContentInteraction. */
  contentInteraction?: boolean;
  /** Per-event custom dimensions. Keys are dimension IDs, values are property paths. */
  customDimensions?: Record<string, string>;
}

export interface Env extends DestinationWeb.Env {
  window: {
    _paq: Array<unknown>;
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
