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
  debug?: boolean;
  include?: Include;
  items?: Items;
  measurementId: string;
  pageview?: boolean;
  params?: Params;
  server_container_url?: string;
  snakeCase?: boolean;
  transport_url?: string;
}

export interface CustomEvent {
  include?: Include;
  items?: Items;
  params?: Params;
}

export interface Items {
  params?: Params;
}

export interface Params {
  [key: string]: Param;
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

export type GtagItems = Gtag.Item[];
export type Parameters = Gtag.ControlParams &
  Gtag.EventParams &
  Gtag.CustomParams;
