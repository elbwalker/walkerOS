import type { Mapping } from '@walkerOS/types';
import type { DestinationWeb } from '@walkerOS/web-collector';

declare global {
  interface Window {
    dataLayer: Array<unknown> | unknown;
    gtag?: Gtag.Gtag;
  }
}

export type Destination = DestinationWeb.Destination<Settings, EventMapping>;
export type Config = DestinationWeb.Config<Settings, EventMapping>;

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
export interface EventMapping {
  include?: Include;
}

export type EventConfig = Mapping.EventConfig<EventMapping>;

export type Param = Mapping.Value;
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
