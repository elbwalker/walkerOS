import type { WalkerOS, Source } from '@walkeros/core';

declare global {
  interface Window {
    dataLayer?: DataLayer;
    [key: string]: DataLayer | unknown;
  }
}

// DataLayer source configuration extending core source config
export interface DataLayerSourceConfig extends Source.Config {
  settings: Settings;
}

export type DataLayer = Array<unknown>;

export interface Settings extends Record<string, unknown> {
  name?: string; // dataLayer variable name (default: 'dataLayer')
  prefix?: string; // Event prefix (default: 'gtag')
  filter?: (event: unknown) => WalkerOS.PromiseOrValue<boolean>;
}

export type DataLayerEvent = {
  event: string;
  [key: string]: unknown;
};

export type MappedEvent = {
  event?: WalkerOS.DeepPartialEvent & { id: string };
  command?: {
    name: string;
    data: unknown;
  };
};
