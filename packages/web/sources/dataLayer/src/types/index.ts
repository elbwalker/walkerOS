import type { WalkerOS, Source, Elb } from '@walkeros/core';

declare global {
  interface Window {
    dataLayer?: DataLayer;
    [key: string]: DataLayer | unknown;
  }
}

export type DataLayer = Array<unknown>;

// DataLayer uses standard Elb.Fn (no custom push type)
export type Push = Elb.Fn;

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
