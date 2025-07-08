import type {
  Elb,
  Mapping as WalkerOSMapping,
  WalkerOS,
} from '@walkerOS/types';

declare global {
  interface Window {
    [key: string]: DataLayer | unknown;
  }
}

export type DataLayer = Array<unknown>;
export interface Config {
  elb: Elb.Fn | WalkerOS.AnyFunction;
  filter?: (event: unknown) => WalkerOS.PromiseOrValue<boolean>;
  mapping?: Mapping;
  name?: string;
  prefix: string;
  processing?: boolean;
  skipped: unknown[];
}

export interface Mapping {
  [event: string]: Rule | undefined;
}

export type Rule<T = CustomEvent> = Omit<
  WalkerOSMapping.Rule<T>,
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
