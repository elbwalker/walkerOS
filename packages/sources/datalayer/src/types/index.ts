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

export type SupportedMapping<CustomEvent = unknown> = Omit<
  WalkerOSMapping.EventConfig<CustomEvent>,
  'batch' | 'batchFn' | 'batched' | 'consent'
> & { command?: boolean };

export type MappedEvent =
  | { event: WalkerOS.DeepPartialEvent & { id: string }; command?: boolean }
  | undefined;

export interface Mapping {
  [event: string]: SupportedMapping<Custom>;
}

export type Custom = EventMappingValues & EventMappingObjectValues;

export type EventMappingObjectValues = {
  data?: ObjectValue;
  context?: ObjectValue;
  globals?: ObjectValue;
  custom?: ObjectValue;
  user?: ObjectValue;
  nested?: Nested;
  consent?: ObjectValue;
  version?: ObjectValue;
  source?: ObjectValue;
};

export type EventMappingValues = {
  event?: Value;
  id?: Value;
  trigger?: Value;
  entity?: Value;
  action?: Value;
  timestamp?: Value;
  timing?: Value;
  group?: Value;
  count?: Value;
};

export type Nested = {
  type?: Value;
  data?: ObjectValue;
};

export type ObjectValue = {
  [key: string]: Value;
};

export type Value = WalkerOSMapping.Value;
