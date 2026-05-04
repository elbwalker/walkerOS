import type { Collector, Destination, Logger, WalkerOS } from '.';

/**
 * Shared mapping configuration interface.
 * Used by both Source.Config and Destination.Config.
 */
export interface Config<T = unknown> {
  consent?: WalkerOS.Consent; // Required consent to process events
  data?: Value | Values; // Global data transformation
  include?: string[]; // Event sections to flatten into context.data
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
  include?: string[]; // Event sections to flatten into context.data
  ignore?: boolean; // Choose to no process an event when set to true
  silent?: boolean; // Process settings side effects, but suppress the destination's default push call
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

// Per-event callback context. Distinct from Context.Base (lifecycle-time) because mappings have no config/env of their own.
export interface Context {
  event: WalkerOS.DeepPartialEvent;
  /** The surrounding mapping config: a Value (value-level) or a Rule (rule-level). */
  mapping: Value | Rule;
  collector: Collector.Instance;
  logger: Logger.Instance;
  consent?: WalkerOS.Consent;
}

export type Fn = (
  value: unknown,
  context: Context,
) => WalkerOS.PromiseOrValue<WalkerOS.Property | unknown>;

export type Condition = (
  value: unknown,
  context: Context,
) => WalkerOS.PromiseOrValue<boolean>;

export type Validate = (
  value: unknown,
  context: Context,
) => WalkerOS.PromiseOrValue<boolean>;

export type Loop = [Value, Value];

export type Map = { [key: string]: Value };
