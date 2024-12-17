import type { Destination, WalkerOS } from '.';

export interface Config<CustomEvent = unknown> {
  [entity: string]:
    | Record<string, EventConfig<CustomEvent> | Array<EventConfig<CustomEvent>>>
    | undefined;
}

export interface EventConfig<CustomEvent = unknown> {
  batch?: number; // Bundle events for batch processing
  batchFn?: (
    destination: Destination.Destination,
    instance: WalkerOS.Instance,
  ) => void;
  batched?: Destination.Batch<CustomEvent>; // Batch of events to be processed
  condition?: Condition; // Added condition
  consent?: WalkerOS.Consent; // Required consent states process the event
  custom?: CustomEvent; // Arbitrary but protected configurations for custom event config
  data?: Data; // Mapping of event data
  ignore?: boolean; // Choose to no process an event when set to true
  name?: string; // Use a custom event name
}

export interface EventMapping {
  eventMapping?: EventConfig;
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
  obj: WalkerOS.AnyObject,
  mapping?: Value,
  instance?: WalkerOS.Instance,
) => boolean;

export type Fn = (
  event: WalkerOS.PartialEvent,
  mapping: Value,
  options: Options,
) => WalkerOS.Property | void;

export type Loop = [Value, Value];

export type Map = { [key: string]: Value };

export interface Options {
  instance?: WalkerOS.Instance;
  props?: unknown;
}

export type Validate = (value?: unknown) => boolean;
