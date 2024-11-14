import type { Mapping as WalkerOSMapping, WalkerOS } from '@elbwalker/types';

declare global {
  interface Window {
    [key: string]: DataLayer | undefined;
  }
}

export type DataLayer = Array<unknown>;
export interface Config {
  elb: WalkerOS.Elb;
  dataLayer: DataLayer;
  name?: string;
  mapping?: Mapping;
  prefix: string;
  processedEvents: Set<string>;
}

export interface Mapping {
  [event: string]: EventMapping;
}

export type EventMapping = EventMappingValues &
  EventMappingObjectValues & {
    event?: string;
    version?: Version;
    source?: Source;
  };

export type EventMappingObjectValues = {
  data?: ObjectValue;
  context?: ObjectValue;
  globals?: ObjectValue;
  custom?: ObjectValue;
  user?: ObjectValue;
  // nested?: WalkerOS.Entities; // @TODO
  consent?: ObjectValue;
};

export type EventMappingValues = {
  id?: Value;
  trigger?: Value;
  entity?: Value;
  action?: Value;
  timestamp?: Value;
  timing?: Value;
  group?: Value;
  count?: Value;
};

export type ObjectValue = {
  [key: string]: Value;
};

export type Version = Partial<{
  [K in keyof WalkerOS.Version]: Value;
}>;
export type Source = Partial<{
  [K in keyof WalkerOS.Source]: Value;
}>;

export type Value = WalkerOSMapping.Value;
