import type { Mapping } from '@elbwalker/types';
import type { DestinationWeb } from '@elbwalker/walker.js';

declare global {
  interface Window {
    dataLayer: Array<unknown> | unknown;
    gtag: Gtag.Gtag;
  }
}

export interface Destination
  extends DestinationWeb.Destination<Custom, CustomEvent> {}

export type Config = DestinationWeb.Config<Custom, CustomEvent>;

export interface Custom {
  measurementId: string;
  debug?: boolean;
  include?: Include;
  pageview?: boolean;
  server_container_url?: string;
  snakeCase?: boolean;
  transport_url?: string;
}

export type EventConfig = Mapping.EventConfig<CustomEvent>;

export interface CustomEvent {
  include?: Include;
}

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
