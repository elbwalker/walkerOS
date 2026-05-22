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
  /**
   * Batch scheduling for this event mapping. A bare number is the
   * debounce `wait` window (legacy form). Object form supports `wait`
   * (debounce ms), `size` (count cap), and `age` (max ms since first
   * entry). Destination-level `config.batch` provides upper bounds
   * applied at scheduler creation; mapping-level values override
   * destination-level for matched events.
   */
  batch?: number | Destination.BatchOptions;
  condition?: Condition; // Added condition
  consent?: WalkerOS.Consent; // Required consent states process the event
  settings?: Settings; // Arbitrary but protected configurations for custom event config
  data?: Data; // Mapping of event data
  include?: string[]; // Event sections to flatten into context.data
  ignore?: boolean; // Choose to no process an event when set to true
  silent?: boolean; // Process settings side effects, but suppress the destination's default push call
  name?: string; // Use a custom event name
  policy?: Policy; // Event-level policy applied after config-level policy
  /**
   * Merge mode (config layer): a partial Rule deep-merged onto the
   * package-shipped default rule at the same key, instead of replacing it.
   * Resolved at the consuming package's init via `mergeMappingRule`; not
   * seen by the runtime evaluator. A `null` value clears an inherited field.
   * Presence of `extend` or `remove` switches this rule from replace to merge.
   */
  extend?: RulePatch<Settings>;
  /**
   * Output layer: dotted paths stripped from the produced data payload
   * after evaluation, regardless of how each field was produced. Applied
   * last, so it always wins.
   */
  remove?: string[];
}

/**
 * A partial Rule used by `Rule.extend`. Every field is optional, and a
 * `null` value clears the inherited field (JSON merge-patch delete). The
 * control fields `extend` and `remove` are excluded: a patch models only
 * direct rule fields, matching what the runtime patch schema accepts.
 */
type RulePatchFields<Settings = unknown> = Omit<
  Rule<Settings>,
  'extend' | 'remove'
>;
export type RulePatch<Settings = unknown> = {
  [K in keyof RulePatchFields<Settings>]?: RulePatchFields<Settings>[K] | null;
};

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
