import type { Mapping as WalkerOSMapping, WalkerOS } from '@elbwalker/types';

declare global {
  interface Window {
    [key: string]: DataLayer | undefined;
  }
}

export type DataLayer = Array<unknown>;
export interface Config {
  elb: WalkerOS.Elb | WalkerOS.AnyFunction;
  dataLayer: DataLayer;
  mapping?: Mapping;
  name?: string;
  prefix: string;
  processedEvents: Set<string>;
}

export interface Mapping {
  [event: string]: EventConfig | undefined;
}

export type EventConfig<CustomEvent = unknown> = Omit<
  WalkerOSMapping.EventConfig<CustomEvent>,
  'batch' | 'batchFn' | 'batched' | 'consent'
> & { command?: boolean };

export type MappedEvent =
  | { event: WalkerOS.DeepPartialEvent & { id: string }; command?: boolean }
  | undefined;
