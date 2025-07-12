import type { Destination, WalkerOS } from '.';

export interface Rules<T = Rule> {
  [entity: string]: Record<string, T | Array<T>> | undefined;
}

export interface Rule<Settings = unknown> {
  batch?: number; // Bundle events for batch processing
  batchFn?: (
    destination: Destination.Destination,
    collector: WalkerOS.Collector,
  ) => void;
  batched?: Destination.Batch<Settings>; // Batch of events to be processed
  condition?: Condition; // Added condition
  consent?: WalkerOS.Consent; // Required consent states process the event
  settings?: Settings; // Arbitrary but protected configurations for custom event config
  data?: Data; // Mapping of event data
  ignore?: boolean; // Choose to no process an event when set to true
  name?: string; // Use a custom event name
}

export interface Result {
  eventMapping?: Rule;
  mappingKey?: string;
}

export type Data = Value | Values;
export type Value = ValueType | Array<ValueType>;
export type Values = Array<Value>;
export type ValueType = string | ValueConfig;

export interface ValueConfig {
  condition?: Condition;
  consent?: WalkerOS.Consent;
  fn?: Fn;
  key?: string;
  loop?: Loop;
  map?: Map;
  set?: Value[];
  validate?: Validate;
  value?: WalkerOS.PropertyType;
}

export type Condition = (
  value: WalkerOS.DeepPartialEvent | unknown,
  mapping?: Value,
  collector?: WalkerOS.Collector,
) => WalkerOS.PromiseOrValue<boolean>;

export type Fn = (
  value: WalkerOS.DeepPartialEvent | unknown,
  mapping: Value,
  options: Options,
) => WalkerOS.PromiseOrValue<WalkerOS.Property | unknown>;

export type Loop = [Value, Value];

export type Map = { [key: string]: Value };

export interface Options {
  consent?: WalkerOS.Consent;
  collector?: WalkerOS.Collector;
  props?: unknown;
}

export type Validate = (value?: unknown) => WalkerOS.PromiseOrValue<boolean>;
