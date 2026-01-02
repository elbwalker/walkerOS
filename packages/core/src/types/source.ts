/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  Elb,
  On,
  Logger,
  Mapping as WalkerOSMapping,
  Collector,
} from './index';

/**
 * Base Env interface for dependency injection into sources.
 *
 * Sources receive all their dependencies through this environment object,
 * making them platform-agnostic and easily testable.
 */
export interface BaseEnv {
  [key: string]: unknown;
  push: Collector.PushFn;
  command: Collector.CommandFn;
  sources?: Collector.Sources;
  elb: Elb.Fn;
  logger: Logger.Instance;
}

/**
 * Type bundle for source generics.
 * Groups Settings, Mapping, Push, Env, and InitSettings into a single type parameter.
 *
 * @template S - Settings configuration type
 * @template M - Mapping configuration type
 * @template P - Push function signature (flexible to support HTTP handlers, etc.)
 * @template E - Environment dependencies type
 * @template I - InitSettings configuration type (user input)
 */
export interface Types<
  S = unknown,
  M = unknown,
  P = Elb.Fn,
  E = BaseEnv,
  I = S,
> {
  settings: S;
  initSettings: I;
  mapping: M;
  push: P;
  env: E;
}

/**
 * Generic constraint for Types - ensures T has required properties for indexed access
 */
export type TypesGeneric = {
  settings: any;
  initSettings: any;
  mapping: any;
  push: any;
  env: any;
};

/**
 * Type extractors for consistent usage with Types bundle
 */
export type Settings<T extends TypesGeneric = Types> = T['settings'];
export type InitSettings<T extends TypesGeneric = Types> = T['initSettings'];
export type Mapping<T extends TypesGeneric = Types> = T['mapping'];
export type Push<T extends TypesGeneric = Types> = T['push'];
export type Env<T extends TypesGeneric = Types> = T['env'];

/**
 * Inference helper: Extract Types from Instance
 */
export type TypesOf<I> = I extends Instance<infer T> ? T : never;

export interface Config<
  T extends TypesGeneric = Types,
> extends WalkerOSMapping.Config<Mapping<T>> {
  settings?: InitSettings<T>;
  env?: Env<T>;
  id?: string;
  logger?: Logger.Config;
  disabled?: boolean;
  primary?: boolean;
}

export type PartialConfig<T extends TypesGeneric = Types> = Config<
  Types<
    Partial<Settings<T>> | Settings<T>,
    Partial<Mapping<T>> | Mapping<T>,
    Push<T>,
    Env<T>
  >
>;

export interface Instance<T extends TypesGeneric = Types> {
  type: string;
  config: Config<T>;
  push: Push<T>;
  destroy?(): void | Promise<void>;
  on?(event: On.Types, context?: unknown): void | Promise<void>;
}

export type Init<T extends TypesGeneric = Types> = (
  config: Partial<Config<T>>,
  env: Env<T>,
) => Instance<T> | Promise<Instance<T>>;

export type InitSource<T extends TypesGeneric = Types> = {
  code: Init<T>;
  config?: Partial<Config<T>>;
  env?: Partial<Env<T>>;
  primary?: boolean;
  next?: string;
};

/**
 * Sources configuration for collector.
 * Maps source IDs to their initialization configurations.
 */
export interface InitSources {
  [sourceId: string]: InitSource<any>;
}
