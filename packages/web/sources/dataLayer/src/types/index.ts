import type { Mapping as WalkerOSMapping, WalkerOS } from '@walkerOS/core';

declare global {
  interface Window {
    dataLayer?: DataLayer;
    [key: string]: DataLayer | unknown;
  }
}

export type DataLayer = Array<unknown>;

// Unified collector source interface
export interface Source extends WalkerOS.CollectorSource {
  type: 'dataLayer';
  init?: (
    collector: WalkerOS.Collector,
    config: WalkerOS.CollectorSourceConfig,
  ) => void | Promise<void>;
  settings?: Settings;
  mapping?: WalkerOSMapping.Rules;
}

export interface Settings extends Record<string, unknown> {
  name?: string; // dataLayer variable name (default: 'dataLayer')
  prefix?: string; // Event prefix (default: 'gtag')
  filter?: (event: unknown) => WalkerOS.PromiseOrValue<boolean>;
}

// Legacy config interface (for backward compatibility during migration)
export interface LegacyConfig {
  elb: WalkerOS.Collector['push'];
  filter?: (event: unknown) => WalkerOS.PromiseOrValue<boolean>;
  mapping?: WalkerOSMapping.Rules;
  name?: string;
  prefix: string;
  processing?: boolean;
  skipped: unknown[];
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
