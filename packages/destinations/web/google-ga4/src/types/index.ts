import type { Mapping } from '@elbwalker/types';
import type { WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    dataLayer: Array<unknown> | unknown;
    gtag: Gtag.Gtag;
  }
}

export interface Destination
  extends WebDestination.Destination<CustomConfig, CustomEventConfig> {}

export type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

export interface CustomConfig {
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

export interface CustomEventConfig {
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

export type Param = Mapping.MappingValue;
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
