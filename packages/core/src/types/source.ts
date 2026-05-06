/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  Elb,
  On,
  Logger,
  Mapping as WalkerOSMapping,
  Collector,
  Context as BaseContext,
} from './index';
import type { DestroyFn, SetupFn } from './lifecycle';
import type { Next } from './transformer';

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
 * Groups Settings, Mapping, Push, Env, InitSettings, and Setup into a single type parameter.
 *
 * @template S - Settings configuration type
 * @template M - Mapping configuration type
 * @template P - Push function signature (flexible to support HTTP handlers, etc.)
 * @template E - Environment dependencies type
 * @template I - InitSettings configuration type (user input)
 * @template U - Setup options type (provisioning options for `walker setup`)
 */
export interface Types<
  S = unknown,
  M = unknown,
  P = Elb.Fn,
  E = BaseEnv,
  I = S,
  U = unknown,
> {
  settings: S;
  initSettings: I;
  mapping: M;
  push: P;
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
  push: any;
  env: any;
  setup: any;
};

/**
 * Type extractors for consistent usage with Types bundle
 */
export type Settings<T extends TypesGeneric = Types> = T['settings'];
export type InitSettings<T extends TypesGeneric = Types> = T['initSettings'];
export type Mapping<T extends TypesGeneric = Types> = T['mapping'];
export type Push<T extends TypesGeneric = Types> = T['push'];
export type Env<T extends TypesGeneric = Types> = T['env'];
export type SetupOptions<T extends TypesGeneric = Types> = T['setup'];

/**
 * Inference helper: Extract Types from Instance
 */
export type TypesOf<I> = I extends Instance<infer T> ? T : never;

export interface Config<
  T extends TypesGeneric = Types,
> extends WalkerOSMapping.Config<Mapping<T>> {
  /** Implementation-specific configuration passed to the init function. */
  settings?: InitSettings<T>;
  /** Runtime dependencies injected by the collector (push, command, logger, etc.). */
  env?: Env<T>;
  /** Source identifier; defaults to the InitSources object key. */
  id?: string;
  /** Logger configuration (level, handler) to override the collector's defaults. */
  logger?: Logger.Config;
  /** Mark as primary source; its push function becomes the exported `elb` from startFlow. */
  primary?: boolean;
  /** Defer source initialization until these collector events fire (e.g., `['consent']`). */
  require?: string[];
  /**
   * Provisioning options for `walker setup`. `boolean | object`.
   * Triggered only by explicit CLI invocation; never automatic.
   */
  setup?: boolean | SetupOptions<T>;
  /**
   * Ingest metadata extraction mapping.
   * Extracts values from raw request objects (Express req, Lambda event, etc.)
   * using walkerOS mapping syntax. Extracted data flows to transformers/destinations.
   *
   * @example
   * ingest: {
   *   ip: 'req.ip',
   *   ua: 'req.headers.user-agent',
   *   origin: 'req.headers.origin'
   * }
   */
  ingest?: WalkerOSMapping.Data;
  /** Completely skip this source — no init, no event capture. */
  disabled?: boolean;
}

export type PartialConfig<T extends TypesGeneric = Types> = Config<
  Types<
    Partial<Settings<T>> | Settings<T>,
    Partial<Mapping<T>> | Mapping<T>,
    Push<T>,
    Env<T>,
    InitSettings<T>,
    SetupOptions<T>
  >
>;

export interface Instance<T extends TypesGeneric = Types> {
  type: string;
  config: Config<T>;
  setup?: SetupFn<Config<T>, Env<T>>;
  push: Push<T>;
  destroy?: DestroyFn<Config<T>, Env<T>>;
  on?(
    event: On.Types,
    context?: unknown,
  ): void | boolean | Promise<void | boolean>;
}

/**
 * Context provided to source init function.
 * Extends base context with source-specific properties.
 */
export interface Context<
  T extends TypesGeneric = Types,
> extends BaseContext.Base<Partial<Config<T>>, Env<T>> {
  id: string;
  /**
   * Sets ingest metadata for the current request.
   * Extracts values from the raw request using config.ingest mapping.
   * The extracted data is passed through to transformers and destinations.
   *
   * @param value - Raw request object (Express req, Lambda event, etc.)
   */
  setIngest: (value: unknown) => Promise<void>;
  /** Sets respond function for the current request. Called by source per-request. */
  setRespond: (fn: import('../respond').RespondFn | undefined) => void;
}

export type Init<T extends TypesGeneric = Types> = (
  context: Context<T>,
) => Instance<T> | Promise<Instance<T>>;

export type InitSource<T extends TypesGeneric = Types> = {
  code: Init<T>;
  config?: Partial<Config<T>>;
  env?: Partial<Env<T>>;
  primary?: boolean;
  next?: Next;
  before?: Next;
  cache?: import('./cache').Cache;
};

/**
 * Sources configuration for collector.
 * Maps source IDs to their initialization configurations.
 */
export interface InitSources {
  [sourceId: string]: InitSource<any>;
}

/**
 * Renderer hint for source simulation UI.
 * - 'browser': Source needs a real DOM (iframe with live preview)
 * - 'codebox': Source uses a JSON/code editor (default)
 */
export type Renderer = 'browser' | 'codebox';
