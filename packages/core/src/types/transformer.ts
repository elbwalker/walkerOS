/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Collector, Logger, WalkerOS, Context as BaseContext } from '.';
import type { DestroyFn } from './lifecycle';
import type { Ingest } from './ingest';
import type { Config as MappingConfig } from './mapping';
import type { MatchExpression } from './matcher';

/**
 * Unified route grammar for Flow v4. A `Route` is one of:
 * - a transformer ID string (`"redact"`)
 * - a sequence of routes (`["a", "b", "c"]` — sugar for chained `.next`)
 * - a `RouteConfig` — a gated / dispatching node.
 *
 * `RouteConfig` is a disjoint union — set exactly one of `next`, `one`,
 * `many`, or neither (pure gate). The disjointness is enforced by `never`
 * sibling properties at the type level and `z.strictObject` at the schema
 * level.
 *
 * Operators:
 * - `next`: single continuation.
 * - `one`: first-match dispatch (walk entries, first whose match passes wins).
 * - `many`: all-match terminal fan-out (every matching entry spawns an
 *   independent flow; main chain terminates here). Restricted to
 *   pre-collector positions (source.next, transformer.next, transformer.before).
 */
export type Route = string | Route[] | RouteConfig;

export type RouteConfig =
  | RouteNextConfig
  | RouteOneConfig
  | RouteManyConfig
  | RouteGateConfig;

export interface RouteNextConfig {
  match?: MatchExpression;
  next: Route;
  one?: never;
  many?: never;
}

export interface RouteOneConfig {
  match?: MatchExpression;
  one: Route[];
  next?: never;
  many?: never;
}

export interface RouteManyConfig {
  match?: MatchExpression;
  many: Route[];
  next?: never;
  one?: never;
}

export interface RouteGateConfig {
  match: MatchExpression;
  next?: never;
  one?: never;
  many?: never;
}

/**
 * Base environment interface for walkerOS transformers.
 *
 * Minimal like Destination - just an extensible object.
 * Transformers receive dependencies through context, not env.
 */
export interface BaseEnv {
  [key: string]: unknown;
}

/**
 * Type bundle for transformer generics.
 * Groups Settings, InitSettings, and Env into a single type parameter.
 * Follows the Source/Destination pattern.
 *
 * @template S - Settings configuration type
 * @template E - Environment type
 * @template I - InitSettings configuration type (user input)
 */
export interface Types<S = unknown, E = BaseEnv, I = S> {
  settings: S;
  initSettings: I;
  env: E;
}

/**
 * Generic constraint for Types - ensures T has required properties for indexed access.
 */
export type TypesGeneric = {
  settings: any;
  initSettings: any;
  env: any;
};

/**
 * Type extractors for consistent usage with Types bundle.
 */
export type Settings<T extends TypesGeneric = Types> = T['settings'];
export type InitSettings<T extends TypesGeneric = Types> = T['initSettings'];
export type Env<T extends TypesGeneric = Types> = T['env'];

/**
 * Inference helper: Extract Types from Instance.
 */
export type TypesOf<I> = I extends Instance<infer T> ? T : never;

/**
 * Transformer configuration.
 */
export interface Config<T extends TypesGeneric = Types> {
  settings?: InitSettings<T>;
  env?: Env<T>;
  id?: string;
  logger?: Logger.Config;
  before?: Route; // Pre-transformer chain (runs before push)
  next?: Route; // Graph wiring to next transformer
  cache?: import('./cache').Cache; // Step-level cache config
  init?: boolean; // Track init state (like Destination)
  disabled?: boolean; // Completely skip this transformer in chains
  /** Return this value instead of calling push(). Global mock for all chains. */
  mock?: unknown;
  /** Path-specific mock values keyed by chain path (e.g., "destination.ga4.before"). Takes precedence over global mock. */
  chainMocks?: Record<string, unknown>;
  /**
   * Declarative event-to-event mapping applied when this transformer step
   * has no `code`. Same field name as on `Destination.Config`, but the
   * semantic differs by position: on a destination, `mapping` produces a
   * vendor-shaped payload; on a transformer step, it mutates the event
   * itself. The collector synthesizes a push that runs
   * `processEventMapping` and returns the transformed event (or drops it
   * when a rule has `ignore: true`).
   *
   * At the transformer position, only event-mutating fields apply:
   * `policy`, `mapping[].policy`, `mapping[].name`, `mapping[].ignore`,
   * `mapping[].consent`, `include`. Vendor-payload fields (`data`,
   * `mapping[].data`, `silent`) are ignored at this position with a
   * one-time warning.
   */
  mapping?: MappingConfig;
}

/**
 * Context provided to transformer functions.
 * Extends base context with transformer-specific properties.
 */
export interface Context<
  T extends TypesGeneric = Types,
> extends BaseContext.Base<Config<T>, Env<T>> {
  id: string;
  ingest: Ingest;
}

/**
 * Unified result type for transformer functions.
 * Replaces the old union return type with a structured object.
 *
 * @field event - Modified event to continue with
 * @field respond - Wrapped respond function for downstream transformers
 * @field next - Branch to a different chain (replaces BranchResult)
 */
export interface Result<E = WalkerOS.DeepPartialEvent> {
  event?: E;
  respond?: import('../respond').RespondFn;
  next?: Route;
}

/**
 * Result of running a transformer chain.
 * Returns the processed event (singular, fan-out array, or null if dropped)
 * alongside the potentially wrapped respond function.
 *
 * `stopped` signals pipeline-halt — when set, the caller MUST NOT propagate
 * the event further downstream (no destinations, no subsequent chains).
 * Used by `cache.stop: true` on pre-collector transformers so the documented
 * "downstream transformers and destinations are skipped" semantic holds.
 */
export interface ChainResult {
  event: WalkerOS.DeepPartialEvent | WalkerOS.DeepPartialEvent[] | null;
  respond?: import('../respond').RespondFn;
  stopped?: true;
}

/**
 * The main transformer function.
 *
 * Pre-collector transformers use default E = DeepPartialEvent.
 * Post-collector transformers can use E = Event for type-safe access.
 * A transformer written for DeepPartialEvent works in both positions
 * because Event is a subtype of DeepPartialEvent.
 *
 * @returns Result - structured result with event, respond, next
 * @returns Result[] - fan-out: each Result continues independently through remaining chain
 * @returns void - continue with current event unchanged (passthrough)
 * @returns false - stop chain, cancel further processing
 */
export type Fn<
  T extends TypesGeneric = Types,
  E = WalkerOS.DeepPartialEvent,
> = (
  event: E,
  context: Context<T>,
) => WalkerOS.PromiseOrValue<Result<E> | Result<E>[] | false | void>;

/**
 * Optional initialization function.
 * Called once before first push.
 *
 * @param context - Transformer context
 * @returns void - initialization successful
 * @returns false - initialization failed, skip this transformer
 * @returns Config<T> - return updated config
 */
export type InitFn<T extends TypesGeneric = Types> = (
  context: Context<T>,
) => WalkerOS.PromiseOrValue<void | false | Config<T>>;

/**
 * Transformer instance returned by Init function.
 */
export interface Instance<T extends TypesGeneric = Types> {
  type: string;
  config: Config<T>;
  push: Fn<T>; // Named "push" for consistency with Source/Destination
  init?: InitFn<T>; // Optional, called once before first push
  destroy?: DestroyFn<Config<T>, Env<T>>;
}

/**
 * Transformer initialization function.
 * Creates a transformer instance from context.
 */
export type Init<T extends TypesGeneric = Types> = (
  context: Context<Types<Partial<Settings<T>>, Env<T>, InitSettings<T>>>,
) => Instance<T> | Promise<Instance<T>>;

/**
 * Configuration for initializing a transformer.
 * Used in collector registration.
 */
export type InitTransformer<T extends TypesGeneric = Types> = {
  /**
   * Initialization function. When omitted, the entry is a pass-through step:
   * - If `mapping` is present, the collector synthesizes a mapping-only
   *   push using `processEventMapping`.
   * - Otherwise it's a named hop that only hosts a `before` / `next` /
   *   `cache` chain.
   *
   * Validation: an entry without `code` must declare at least one of
   * `package`, `before`, `next`, `cache`, `mapping`. Enforced by
   * `validateStepEntry` in `@walkeros/core`.
   */
  code?: Init<T>;
  config?: Partial<Config<T>>;
  env?: Partial<Env<T>>;
  before?: Route;
  next?: Route;
  cache?: import('./cache').Cache;
  mapping?: MappingConfig;
  validate?: import('./validate').Validate;
};

/**
 * Transformers configuration for collector.
 * Maps transformer IDs to their initialization configurations.
 */
export interface InitTransformers {
  [transformerId: string]: InitTransformer<any>;
}

/**
 * Active transformer instances registry.
 */
export interface Transformers {
  [transformerId: string]: Instance;
}

/**
 * Typed accessor for transformers registered on a collector.
 *
 * The collector's `transformers` bag indexes to `Transformer.Instance`
 * (defaults erase the generic). Use this helper at the call site to recover
 * the narrow type without casts.
 *
 * @example
 * type MyTransformerTypes = Transformer.Types<MySettings>;
 * const tx = getTransformer<MyTransformerTypes>(collector, 'redact');
 * await tx.push(event, context);
 *
 * @throws Error with message `Transformer not found: <id>` when the id is unknown.
 */
export function getTransformer<T extends TypesGeneric = Types>(
  collector: { transformers: { [id: string]: Instance<any> } },
  id: string,
): Instance<T> {
  const transformer = collector.transformers[id];
  if (!transformer) {
    throw new Error(`Transformer not found: ${id}`);
  }
  return transformer as unknown as Instance<T>;
}
