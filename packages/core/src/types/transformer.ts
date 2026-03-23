/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Collector, Logger, WalkerOS, Context as BaseContext } from '.';
import type { DestroyFn } from './lifecycle';

export interface NextRule {
  match: import('./matcher').MatchExpression | '*';
  next: Next;
}

export type Next = string | string[] | NextRule[];

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
  next?: Next; // Graph wiring to next transformer
  init?: boolean; // Track init state (like Destination)
}

/**
 * Context provided to transformer functions.
 * Extends base context with transformer-specific properties.
 */
export interface Context<
  T extends TypesGeneric = Types,
> extends BaseContext.Base<Config<T>, Env<T>> {
  id: string;
  ingest?: unknown;
}

/**
 * Unified result type for transformer functions.
 * Replaces the old union return type with a structured object.
 *
 * @field event - Modified event to continue with
 * @field respond - Wrapped respond function for downstream transformers
 * @field next - Branch to a different chain (replaces BranchResult)
 */
export interface Result {
  event?: WalkerOS.DeepPartialEvent;
  respond?: import('../respond').RespondFn;
  next?: Next;
}

/**
 * The main transformer function.
 * Uses DeepPartialEvent for consistency across pre/post collector.
 *
 * @param event - The event to process
 * @param context - Transformer context with collector, config, env, logger
 * @returns Result - structured result with event, respond, next
 * @returns void - continue with current event unchanged (passthrough)
 * @returns false - stop chain, cancel further processing
 */
export type Fn<T extends TypesGeneric = Types> = (
  event: WalkerOS.DeepPartialEvent,
  context: Context<T>,
) => WalkerOS.PromiseOrValue<Result | false | void>;

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
  code: Init<T>;
  config?: Partial<Config<T>>;
  env?: Partial<Env<T>>;
  next?: Next;
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
