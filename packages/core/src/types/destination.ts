/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  Collector,
  Handler,
  Mapping as WalkerOSMapping,
  On,
  WalkerOS,
} from '.';

/**
 * Base environment requirements interface for walkerOS destinations
 *
 * This defines the core interface that destinations can use to declare
 * their runtime environment requirements. Platform-specific extensions
 * should extend this interface.
 */
export interface BaseEnv {
  /**
   * Generic global properties that destinations may require
   * Platform-specific implementations can extend this interface
   */
  [key: string]: unknown;
}

/**
 * Type bundle for destination generics.
 * Groups Settings, Mapping, and Env into a single type parameter.
 */
export interface Types<S = unknown, M = unknown, E = BaseEnv> {
  settings: S;
  mapping: M;
  env: E;
}

/**
 * Generic constraint for Types - ensures T has required properties for indexed access
 */
export type TypesGeneric = { settings: any; mapping: any; env: any };

/**
 * Type extractors for consistent usage with Types bundle
 */
export type Settings<T extends TypesGeneric = Types> = T['settings'];
export type Mapping<T extends TypesGeneric = Types> = T['mapping'];
export type Env<T extends TypesGeneric = Types> = T['env'];

/**
 * Inference helper: Extract Types from Instance
 */
export type TypesOf<I> = I extends Instance<infer T> ? T : never;

export interface Instance<T extends TypesGeneric = Types> {
  config: Config<T>;
  queue?: WalkerOS.Events;
  dlq?: DLQ;
  type?: string;
  env?: Env<T>;
  init?: InitFn<T>;
  push: PushFn<T>;
  pushBatch?: PushBatchFn<T>;
  on?: On.OnFn;
}

export interface Config<T extends TypesGeneric = Types> {
  consent?: WalkerOS.Consent;
  settings?: Settings<T>;
  data?: WalkerOSMapping.Value | WalkerOSMapping.Values;
  env?: Env<T>;
  id?: string;
  init?: boolean;
  loadScript?: boolean;
  mapping?: WalkerOSMapping.Rules<WalkerOSMapping.Rule<Mapping<T>>>;
  policy?: Policy;
  queue?: boolean;
  verbose?: boolean;
  onError?: Handler.Error;
  onLog?: Handler.Log;
}

export type PartialConfig<T extends TypesGeneric = Types> = Config<
  Types<
    Partial<Settings<T>> | Settings<T>,
    Partial<Mapping<T>> | Mapping<T>,
    Env<T>
  >
>;

export interface Policy {
  [key: string]: WalkerOSMapping.Value;
}

export type Init<T extends TypesGeneric = Types> = {
  code: Instance<T>;
  config?: Partial<Config<T>>;
  env?: Partial<Env<T>>;
};

export interface InitDestinations {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: Init<any>;
}

export interface Destinations {
  [key: string]: Instance;
}

export interface Context<T extends TypesGeneric = Types> {
  collector: Collector.Instance;
  config: Config<T>;
  data?: Data;
  env: Env<T>;
}

export interface PushContext<T extends TypesGeneric = Types>
  extends Context<T> {
  mapping?: WalkerOSMapping.Rule<Mapping<T>>;
}

export interface PushBatchContext<T extends TypesGeneric = Types>
  extends Context<T> {
  mapping?: WalkerOSMapping.Rule<Mapping<T>>;
}

export type InitFn<T extends TypesGeneric = Types> = (
  context: Context<T>,
) => WalkerOS.PromiseOrValue<void | false | Config<T>>;

export type PushFn<T extends TypesGeneric = Types> = (
  event: WalkerOS.Event,
  context: PushContext<T>,
) => WalkerOS.PromiseOrValue<void>;

export type PushBatchFn<T extends TypesGeneric = Types> = (
  batch: Batch<Mapping<T>>,
  context: PushBatchContext<T>,
) => void;

export type PushEvent<Mapping = unknown> = {
  event: WalkerOS.Event;
  mapping?: WalkerOSMapping.Rule<Mapping>;
};
export type PushEvents<Mapping = unknown> = Array<PushEvent<Mapping>>;

export interface Batch<Mapping> {
  key: string;
  events: WalkerOS.Events;
  data: Array<Data>;
  mapping?: WalkerOSMapping.Rule<Mapping>;
}

export type Data =
  | WalkerOS.Property
  | undefined
  | Array<WalkerOS.Property | undefined>;

export type Ref = {
  id: string;
  destination: Instance;
};

export type Push = {
  queue?: WalkerOS.Events;
  error?: unknown;
};

export type DLQ = Array<[WalkerOS.Event, unknown]>;

export type Result = {
  successful: Array<Ref>;
  queued: Array<Ref>;
  failed: Array<Ref>;
};
