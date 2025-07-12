import type { Mapping as WalkerOSMapping } from '@walkerOS/core';
import type { DestinationWeb } from '@walkerOS/web-collector';

declare global {
  interface Window {
    dataLayer: Array<unknown> | unknown;
    gtag?: Gtag.Gtag;
  }
}

export type Destination = DestinationWeb.Destination<Settings, Mapping>;
export type Config = DestinationWeb.Config<Settings, Mapping>;

// Destination-specific settings (internal usage)
export interface Settings {
  measurementId: string;
  debug?: boolean;
  include?: Include;
  pageview?: boolean;
  server_container_url?: string;
  snakeCase?: boolean;
  transport_url?: string;
}

// Single event transformation rule
export interface Mapping {
  include?: Include;
}

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
export type Param = WalkerOSMapping.Value;
export type Include = Array<
  | 'all'
  | 'context'
  | 'data'
  | 'event'
  | 'globals'
  | 'source'
  | 'user'
  | 'version'
>;

export type Parameters = Gtag.ControlParams &
  Gtag.EventParams &
  Gtag.CustomParams;
