/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  Elb,
  On,
  Logger,
  Mapping as WalkerOSMapping,
  Collector,
  Context as BaseContext,
} from './index';
import type { Ingest } from './ingest';
import type { DestroyFn, SetupFn } from './lifecycle';
import type { RespondFn } from '../respond';
import type { Route } from './transformer';

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
 * @template U - Setup options type (provisioning options for `walkeros setup`)
 */
export interface Types<
  S = unknown,
  M = unknown,
  P = Elb.Fn,
  E = BaseEnv,
  I = S,
  U = unknown,
  C = unknown,
> {
  settings: S;
  initSettings: I;
  mapping: M;
  push: P;
  env: E;
  setup: U;
  credentials: C;
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
  credentials: any;
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
export type Credentials<T extends TypesGeneric = Types> = T['credentials'];

/**
 * Inference helper: Extract Types from Instance
 */
export type TypesOf<I> = I extends Instance<infer T> ? T : never;

export interface Config<
  T extends TypesGeneric = Types,
> extends WalkerOSMapping.Config<Mapping<T>> {
  /** Implementation-specific configuration passed to the init function. */
  settings?: InitSettings<T>;
  /**
   * Optional, strictly-typed credentials slot ($env-resolved). The package
   * defines the shape via `Types['credentials']`. `settings.<sdk>` stays the
   * escape hatch for raw SDK options.
   */
  credentials?: Credentials<T>;
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
   * Provisioning options for `walkeros setup`. `boolean | object`.
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
  /**
   * Init lifecycle flag. Set by the collector to `true` after `Instance.init()`
   * has been called. Used together with `require` to gate `on()` delivery:
   * lifecycle events are queued in `Instance.queueOn` until both
   * `config.init === true` and `config.require` is empty/absent, then replayed.
   */
  init?: boolean;
  /** Declarative store get/set operations applied around this source. */
  state?: import('./state').State | import('./state').State[];
}

export type PartialConfig<T extends TypesGeneric = Types> = Config<
  Types<
    Partial<Settings<T>> | Settings<T>,
    Partial<Mapping<T>> | Mapping<T>,
    Push<T>,
    Env<T>,
    InitSettings<T>,
    SetupOptions<T>,
    Credentials<T>
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
  /**
   * Optional setup hook. Called by the collector eagerly after all source
   * factories have run, regardless of `config.require`. Use for prep work
   * such as draining a pre-init window queue or attaching DOM listeners.
   * The collector still gates `on()` delivery, and `Collector.push`
   * enforces `allowed`/consent at the destination layer.
   */
  init?: () => void | Promise<void>;
  /**
   * Lifecycle event queue. Populated by `onApply` when the source is not
   * yet started (`config.init !== true` or `config.require` non-empty).
   * Flushed by the collector when the source becomes started.
   */
  queueOn?: Array<{ type: On.Types; data: unknown }>;
}

/**
 * Per-scope environment passed to the body of `Source.Context.withScope`.
 *
 * Each call to `withScope` builds a fresh `ScopeEnv` whose `push` captures
 * the per-scope `ingest` and `respond`. Concurrent scopes cannot crosstalk:
 * each one carries its own ingest and respond all the way through the
 * pipeline. Server sources MUST use `withScope` per inbound request; sources
 * with a single logical scope (browser tab lifetime, dataLayer) may skip it
 * and use the factory-scope `env.push` directly.
 */
export type ScopeEnv<T extends TypesGeneric = Types> = Env<T> & {
  /** Per-scope push: captures the scope's ingest and respond for this call. */
  push: Collector.PushFn;
  /** Ingest metadata extracted from the raw scope input (if config.ingest is set). */
  ingest: Ingest;
  /** Respond function bound to this scope (undefined for scopes without a response). */
  respond?: RespondFn;
};

/**
 * Context provided to source init function.
 * Extends base context with source-specific properties.
 */
export interface Context<
  T extends TypesGeneric = Types,
> extends BaseContext.Base<Partial<Config<T>>, Env<T>> {
  id: string;
  /**
   * Bind ingest and respond to a single scope of work (e.g. one inbound
   * HTTP request, one queue message). Builds a fresh `Ingest` from the
   * raw input via `config.ingest` mapping, wires the per-scope `respond`,
   * and invokes `body(scopeEnv)` with a push function that captures both.
   *
   * Server sources call this once per inbound request:
   *
   * ```ts
   * await context.withScope(req, createRespond(sender), async (env) => {
   *   await env.push(parsedData);
   * });
   * ```
   *
   * Browser sources with a single tab-lifetime scope may skip `withScope`
   * and use `env.push` directly.
   *
   * @param rawScope - Raw input for `config.ingest` mapping (Express req,
   *   Lambda event, fetch Request, etc.). Pass `undefined` if no ingest
   *   mapping applies.
   * @param respond - Per-scope respond function, or `undefined` if the
   *   scope produces no response.
   * @param body - Async callback receiving the per-scope env.
   * @returns The body's return value.
   */
  withScope: <R>(
    rawScope: unknown,
    respond: RespondFn | undefined,
    body: (env: ScopeEnv<T>) => Promise<R>,
  ) => Promise<R>;
}

export type Init<T extends TypesGeneric = Types> = (
  context: Context<T>,
) => Instance<T> | Promise<Instance<T>>;

export type InitSource<T extends TypesGeneric = Types> = {
  code: Init<T>;
  config?: Partial<Config<T>>;
  env?: Partial<Env<T>>;
  primary?: boolean;
  next?: Route;
  before?: Route;
  cache?: import('./cache').Cache;
  state?: import('./state').State | import('./state').State[];
  validate?: import('./validate').Validate;
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

/**
 * Typed accessor for sources registered on a collector.
 *
 * The collector's `sources` bag indexes to `Source.Instance` (defaults erase
 * the generic), which collapses the source's declared `push` signature to
 * `Elb.Fn`. Use this helper at the call site to recover the narrow type
 * without casts.
 *
 * @example
 * type TestSourceTypes = Source.Types<unknown, unknown, TestPushFn>;
 * const src = getSource<TestSourceTypes>(collector, 'testSource');
 * await src.push({ method: 'GET', path: '/api/data' }); // typed!
 *
 * @throws Error with message `Source not found: <id>` when the id is unknown.
 */
export function getSource<T extends TypesGeneric = Types>(
  collector: { sources: { [id: string]: Instance<any> } },
  id: string,
): Instance<T> {
  const source = collector.sources[id];
  if (!source) {
    throw new Error(`Source not found: ${id}`);
  }
  // Single, contained narrowing. The runtime instance was constructed with
  // generic T at init time; the bag erased the parameter. We're restoring
  // information that already exists at runtime.
  return source as unknown as Instance<T>;
}
