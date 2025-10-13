import type { WalkerOS, Source, Elb } from '@walkeros/core';

declare global {
  interface Window {
    dataLayer?: DataLayer;
    [key: string]: DataLayer | unknown;
  }
}

export type DataLayer = Array<unknown>;

export interface Settings extends Record<string, unknown> {
  name?: string;
  prefix?: string;
  filter?: (event: unknown) => WalkerOS.PromiseOrValue<boolean>;
}

export interface Mapping {}

export type Push = Elb.Fn;

export interface Env extends Source.BaseEnv {
  window?: Window & typeof globalThis;
}

export type Types = Source.Types<Settings, Mapping, Push, Env>;

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
