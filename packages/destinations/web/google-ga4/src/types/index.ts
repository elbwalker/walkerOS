import type { WalkerOS } from '@elbwalker/types';
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
  items?: ItemsConfig;
  measurementId: string;
  pageview?: boolean;
  params?: PropertyMapping;
  server_container_url?: string;
  snakeCase?: boolean;
  transport_url?: string;
}

export interface CustomEventConfig {
  include?: Include;
  items?: ItemsConfig;
  params?: PropertyMapping;
}

export interface ItemsConfig {
  params?: PropertyMapping;
}

export interface PropertyMapping {
  [key: string]: string | PropertyMappingValue;
}

export interface PropertyMappingValue {
  key: string;
  default?: WalkerOS.PropertyType;
}

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

export type Items = Gtag.Item[];
export type Parameters = Gtag.ControlParams &
  Gtag.EventParams &
  Gtag.CustomParams;
