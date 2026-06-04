/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  Collector,
  Logger,
  Mapping as WalkerOSMapping,
  On,
  Transformer,
  WalkerOS,
  Context as BaseContext,
} from '.';
import type { DestroyFn, SetupFn } from './lifecycle';
import type { Ingest } from './ingest';

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
 * Groups Settings, InitSettings, Mapping, Env, and Setup into a single type parameter.
 */
export interface Types<
  S = unknown,
  M = unknown,
  E = BaseEnv,
  I = S,
  U = unknown,
> {
  settings: S;
  initSettings: I;
  mapping: M;
  env: E;
  setup: U;
}

/**
 * Generic constraint for Types - ensures T has required properties for indexed access
 */
export type TypesGeneric = {
  settings: any;
  initSettings: any;
  mapping: any;
  env: any;
  setup: any;
};

/**
 * Type extractors for consistent usage with Types bundle
 */
export type Settings<T extends TypesGeneric = Types> = T['settings'];
export type InitSettings<T extends TypesGeneric = Types> = T['initSettings'];
export type Mapping<T extends TypesGeneric = Types> = T['mapping'];
export type Env<T extends TypesGeneric = Types> = T['env'];
export type SetupOptions<T extends TypesGeneric = Types> = T['setup'];

/**
 * Inference helper: Extract Types from Instance
 */
export type TypesOf<I> = I extends Instance<infer T> ? T : never;

export interface Instance<T extends TypesGeneric = Types> {
  config: Config<T>;
  queuePush?: WalkerOS.Events;
  queueOn?: Array<{ type: On.Types; data?: unknown }>;
  dlq?: DLQ;
  batches?: BatchRegistry<Mapping<T>>;
  type?: string;
  env?: Env<T>;
  setup?: SetupFn<Config<T>, Env<T>>;
  init?: InitFn<T>;
  push: PushFn<T>;
  pushBatch?: PushBatchFn<T>;
  on?: On.OnFn;
  destroy?: DestroyFn<Config<T>, Env<T>>;
}

export interface Config<T extends TypesGeneric = Types> {
  /** Required consent states to push events; queues events when not granted. */
  consent?: WalkerOS.Consent;
  /** Implementation-specific configuration passed to the init function. */
  settings?: InitSettings<T>;
  /** Global data transformation applied to all events; result passed as context.data to push. */
  data?: WalkerOSMapping.Value | WalkerOSMapping.Values;
  /** Event sections to flatten into context.data. */
  include?: string[];
  /** Runtime dependencies merged from code and config env; extensible per destination. */
  env?: Env<T>;
  /** Destination identifier; auto-generated if not provided. */
  id?: string;
  /** Whether the destination has been initialized; prevents re-initialization. */
  init?: boolean;
  /** Whether to load external scripts (e.g., gtag.js); destination-specific behavior. */
  loadScript?: boolean;
  /** Logger configuration (level, handler) to override the collector's defaults. */
  logger?: Logger.Config;
  /** Entity-action rules to filter, rename, transform, and batch events for this destination. */
  mapping?: WalkerOSMapping.Rules<WalkerOSMapping.Rule<Mapping<T>>>;
  /** Pre-processing rules applied to all events before mapping; modifies events in-place. */
  policy?: Policy;
  /** Whether to queue events when consent is not granted; defaults to true. */
  queue?: boolean;
  /** Defer destination initialization until these collector events fire (e.g., `['consent']`). */
  require?: string[];
  /**
   * Provisioning options for `walkeros setup`. `boolean | object`.
   * Triggered only by explicit CLI invocation; never automatic.
   */
  setup?: boolean | SetupOptions<T>;
  /** Transformer chain to run after collector processing but before this destination. */
  before?: Transformer.Route;
  /** Transformer chain to run after destination push completes. Push response available at ingest._response. */
  next?: Transformer.Route;
  /** Cache configuration for deduplication (step-level: skip push on HIT). */
  cache?: import('./cache').Cache;
  /** Declarative store get/set operations applied around this destination. */
  state?: import('./state').State | import('./state').State[];
  /** Completely skip this destination — no init, no push, no queuing. */
  disabled?: boolean;
  /** Return this value instead of calling push(). Uses !== undefined check to support falsy values. */
  mock?: unknown;
  /**
   * Maximum number of consent-denied events retained in `queuePush` for
   * this destination. Overflow drops oldest (FIFO). Default 1000.
   */
  queueMax?: number;
  /**
   * Maximum number of failed-push entries retained in `dlq` for this
   * destination. Overflow drops oldest (FIFO). Default 100.
   */
  dlqMax?: number;
  /**
   * Enables batching for ALL of this destination's events into one shared
   * default buffer. A mapping rule's own `batch` splits that entity-action
   * into its own buffer and overrides per field (`rule ?? config ?? default`).
   * Batching stays off when neither is set. A bare number is treated as the
   * debounce `wait` window.
   *
   * - `wait`: debounce window in ms; the timer resets on every push.
   * - `size`: hard count cap; flush immediately when entries reach this number. Default 1000 when batching is enabled.
   * - `age`: time since the first entry of the current window. Forces a flush even if pushes keep arriving. Default 30000 (30s).
   */
  batch?: number | BatchOptions;
}

/**
 * Batch scheduling options. Used at both the mapping-rule layer
 * (`Mapping.Rule.batch`) and the destination-config layer
 * (`Destination.Config.batch`). Same shape at both layers.
 */
export interface BatchOptions {
  /** Debounce window in ms. Timer resets on every push. */
  wait?: number;
  /** Hard count cap. Flushes immediately at this size. */
  size?: number;
  /** Hard age cap in ms since first entry of current window. */
  age?: number;
}

export type PartialConfig<T extends TypesGeneric = Types> = Config<
  Types<
    Partial<Settings<T>> | Settings<T>,
    Partial<Mapping<T>> | Mapping<T>,
    Env<T>,
    InitSettings<T>,
    SetupOptions<T>
  >
>;

export interface Policy {
  [key: string]: WalkerOSMapping.Value;
}

export type Code<T extends TypesGeneric = Types> = Instance<T>;

export type Init<T extends TypesGeneric = Types> = {
  code: Code<T>;
  config?: Partial<Config<T>>;
  env?: Partial<Env<T>>;
  before?: Transformer.Route;
  next?: Transformer.Route;
  cache?: import('./cache').Cache;
  state?: import('./state').State | import('./state').State[];
  validate?: import('./validate').Validate;
};

export interface InitDestinations {
  [key: string]: Init<any>;
}

export interface Destinations {
  [key: string]: Instance;
}

/**
 * Context provided to destination functions.
 * Extends base context with destination-specific properties.
 */
export interface Context<
  T extends TypesGeneric = Types,
> extends BaseContext.Base<Config<T>, Env<T>> {
  id: string;
  data?: Data;
}

export interface PushContext<
  T extends TypesGeneric = Types,
> extends Context<T> {
  ingest: Ingest;
  rule?: WalkerOSMapping.Rule<Mapping<T>>;
}

export interface PushBatchContext<
  T extends TypesGeneric = Types,
> extends Context<T> {
  ingest: Ingest;
  rule?: WalkerOSMapping.Rule<Mapping<T>>;
}

export type InitFn<T extends TypesGeneric = Types> = (
  context: Context<T>,
) => WalkerOS.PromiseOrValue<void | false | Config<T>>;

export type PushFn<T extends TypesGeneric = Types> = (
  event: WalkerOS.Event,
  context: PushContext<T>,
) => WalkerOS.PromiseOrValue<void | unknown>;

export type PushBatchFn<T extends TypesGeneric = Types> = (
  batch: Batch<Mapping<T>>,
  context: PushBatchContext<T>,
) => WalkerOS.PromiseOrValue<void>;

export type PushEvent<Mapping = unknown> = {
  event: WalkerOS.Event;
  mapping?: WalkerOSMapping.Rule<Mapping>;
};
export type PushEvents<Mapping = unknown> = Array<PushEvent<Mapping>>;

export interface BatchEntry<Mapping = unknown> {
  event: WalkerOS.Event;
  ingest?: Ingest;
  respond?: import('../respond').RespondFn;
  rule?: WalkerOSMapping.Rule<Mapping>;
  data?: Data;
}

export interface Batch<Mapping> {
  key: string;
  /**
   * Per-event entries carrying per-event ingest, respond, rule, and data.
   * Destinations needing per-event metadata should read this instead of
   * (or in addition to) `events` and `data`.
   */
  entries: BatchEntry<Mapping>[];
  /** Derived view: events from `entries`. Kept for back-compat. */
  events: WalkerOS.Events;
  /** Derived view: data from `entries`. Kept for back-compat. */
  data: Array<Data>;
  mapping?: WalkerOSMapping.Rule<Mapping>;
}

export interface BatchRegistry<Mapping> {
  [mappingKey: string]: {
    batched: Batch<Mapping>;
    /**
     * Marks a buffer created by `config.batch` (the destination-wide default
     * batch) rather than a mapping rule's own `batch`. The default buffer is
     * heterogeneous, so its flush reports `rule: undefined` to consumers.
     */
    isDefault?: boolean;
    batchFn: () => void;
    /**
     * Force a flush of the current batch immediately. Used by shutdown
     * drain and by tests for deterministic flushing without timer
     * advancement. Resolves after the underlying `pushBatch` settles.
     */
    flush: () => Promise<void>;
  };
}

export type Data =
  | WalkerOS.Property
  | undefined
  | Array<WalkerOS.Property | undefined>;

export interface Ref {
  type: string; // Destination type ("gtag", "meta", "bigquery")
  data?: unknown; // Response from push()
  error?: unknown; // Error if failed
}

export type Push = {
  queuePush?: WalkerOS.Events;
  error?: unknown;
};

export type DLQ = Array<[WalkerOS.Event, unknown]>;

/**
 * Typed accessor for destinations registered on a collector.
 *
 * The collector's `destinations` bag indexes to `Destination.Instance`
 * (defaults erase the generic). Use this helper at the call site to recover
 * the narrow type without casts.
 *
 * @example
 * type MyDestTypes = Destination.Types<MySettings, MyMapping>;
 * const dest = getDestination<MyDestTypes>(collector, 'myDest');
 * await dest.push(event, context);
 *
 * @throws Error with message `Destination not found: <id>` when the id is unknown.
 */
export function getDestination<T extends TypesGeneric = Types>(
  collector: { destinations: { [id: string]: Instance<any> } },
  id: string,
): Instance<T> {
  const destination = collector.destinations[id];
  if (!destination) {
    throw new Error(`Destination not found: ${id}`);
  }
  return destination as unknown as Instance<T>;
}
