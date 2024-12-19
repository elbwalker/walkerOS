import type { Mapping as WalkerOSMapping, WalkerOS } from '@elbwalker/types';

declare global {
  interface Window {
    [key: string]: DataLayer | undefined;
  }
}

export type DataLayer = Array<unknown>;
export interface Config {
  elb: WalkerOS.Elb | WalkerOS.AnyFunction;
  filter?: (event: unknown) => boolean;
  mapping?: Mapping;
  name?: string;
  prefix: string;
  processing?: boolean;
  skipped?: unknown[];
}

export interface Mapping {
  [event: string]: EventConfig | undefined;
}

export type EventConfig<T = CustomEvent> = Omit<
  WalkerOSMapping.EventConfig<T>,
  'batch' | 'batchFn' | 'batched' | 'consent'
>;

export interface CustomEvent {
  command: WalkerOSMapping.Data;
}

export type MappedEvent = {
  event?: WalkerOS.DeepPartialEvent & { id: string };
  command?: {
    name: string;
    data: unknown;
  };
};
