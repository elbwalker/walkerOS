import type { Collector, Destination, WalkerOS } from '.';

/**
 * Shared mapping configuration interface.
 * Used by both Source.Config and Destination.Config.
 */
export interface Config<T = unknown> {
  consent?: WalkerOS.Consent; // Required consent to process events
  data?: Value | Values; // Global data transformation
  mapping?: Rules<Rule<T>>; // Event-specific mapping rules
  policy?: Policy; // Pre-processing rules
}

export interface Policy {
  [key: string]: Value;
}

export interface Rules<T = Rule> {
  [entity: string]: Record<string, T | Array<T>> | undefined;
}

export interface Rule<Settings = unknown> {
  batch?: number; // Bundle events for batch processing
  batchFn?: (
    destination: Destination.Instance,
    collector: Collector.Instance,
  ) => void;
  batched?: Destination.Batch<Settings>; // Batch of events to be processed
  condition?: Condition; // Added condition
  consent?: WalkerOS.Consent; // Required consent states process the event
  settings?: Settings; // Arbitrary but protected configurations for custom event config
  data?: Data; // Mapping of event data
  ignore?: boolean; // Choose to no process an event when set to true
  name?: string; // Use a custom event name
  policy?: Policy; // Event-level policy applied after config-level policy
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
  collector?: Collector.Instance,
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
  collector?: Collector.Instance;
  props?: unknown;
}

export type Validate = (value?: unknown) => WalkerOS.PromiseOrValue<boolean>;
