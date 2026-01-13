/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Collector, Logger, WalkerOS, Context as BaseContext } from '.';

/**
 * Base environment interface for walkerOS processors.
 *
 * Minimal like Destination - just an extensible object.
 * Processors receive dependencies through context, not env.
 */
export interface BaseEnv {
  [key: string]: unknown;
}

/**
 * Type bundle for processor generics.
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
 * Processor configuration.
 */
export interface Config<T extends TypesGeneric = Types> {
  settings?: InitSettings<T>;
  env?: Env<T>;
  id?: string;
  logger?: Logger.Config;
  next?: string; // Graph wiring to next processor
  init?: boolean; // Track init state (like Destination)
}

/**
 * Context provided to processor functions.
 * Extends base context with processor-specific properties.
 */
export interface Context<
  T extends TypesGeneric = Types,
> extends BaseContext.Base<Config<T>, Env<T>> {
  id: string;
  ingest?: unknown;
}

/**
 * The main processor function.
 * Uses DeepPartialEvent for consistency across pre/post collector.
 *
 * @param event - The event to process
 * @param context - Processor context with collector, config, env, logger
 * @returns event - continue with modified event
 * @returns void - continue with current event unchanged (passthrough)
 * @returns false - stop chain, cancel further processing
 */
export type Fn<T extends TypesGeneric = Types> = (
  event: WalkerOS.DeepPartialEvent,
  context: Context<T>,
) => WalkerOS.PromiseOrValue<WalkerOS.DeepPartialEvent | false | void>;

/**
 * Optional initialization function.
 * Called once before first push.
 *
 * @param context - Processor context
 * @returns void - initialization successful
 * @returns false - initialization failed, skip this processor
 * @returns Config<T> - return updated config
 */
export type InitFn<T extends TypesGeneric = Types> = (
  context: Context<T>,
) => WalkerOS.PromiseOrValue<void | false | Config<T>>;

/**
 * Processor instance returned by Init function.
 */
export interface Instance<T extends TypesGeneric = Types> {
  type: string;
  config: Config<T>;
  push: Fn<T>; // Named "push" for consistency with Source/Destination
  init?: InitFn<T>; // Optional, called once before first push
  destroy?: () => void | Promise<void>;
}

/**
 * Processor initialization function.
 * Creates a processor instance from context.
 */
export type Init<T extends TypesGeneric = Types> = (
  context: Context<Types<Partial<Settings<T>>, Env<T>, InitSettings<T>>>,
) => Instance<T> | Promise<Instance<T>>;

/**
 * Configuration for initializing a processor.
 * Used in collector registration.
 */
export type InitProcessor<T extends TypesGeneric = Types> = {
  code: Init<T>;
  config?: Partial<Config<T>>;
  env?: Partial<Env<T>>;
};

/**
 * Processors configuration for collector.
 * Maps processor IDs to their initialization configurations.
 */
export interface InitProcessors {
  [processorId: string]: InitProcessor<any>;
}

/**
 * Active processor instances registry.
 */
export interface Processors {
  [processorId: string]: Instance;
}
