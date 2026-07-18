import type {
  Source,
  Destination,
  Store,
  Elb as ElbTypes,
  Hooks,
  Logger,
  On,
  Transformer,
  WalkerOS,
  Mapping,
} from '.';
import type { Ingest } from './ingest';
import type { Observe } from '../observeConnect';
import type { ObserverFn } from './observer';

/** Identifies which kind of step a stepId belongs to. */
export type StepKind =
  | 'collector'
  | 'source'
  | 'transformer'
  | 'destination'
  | 'store';

/**
 * Build a stepId for use as a key in `Status.dropped` /
 * `Status.connectionErrors` (and future status maps). The collector-level
 * stepId is the literal "collector" (no id). Source/transformer/destination/
 * store ids take the form `"<kind>.<id>"`, e.g. `"destination.ga4"`.
 *
 * The dot separator mirrors the vocabulary already used in collector
 * log messages ("collector.queue overflow", "destination.dlq overflow").
 */
export function stepId(kind: 'collector'): 'collector';
export function stepId(
  kind: 'source' | 'transformer' | 'destination' | 'store',
  id: string,
): string;
export function stepId(kind: StepKind, id?: string): string {
  if (kind === 'collector') return 'collector';
  if (!id) {
    throw new Error(`stepId(${kind}) requires an id`);
  }
  return `${kind}.${id}`;
}

/**
 * Drop counters at a single step. Each buffer is optional: a step kind
 * may have only `queue` (collector), only `dlq`, both (destinations
 * today), or neither. Counts are monotonic.
 */
export interface DroppedCounters {
  queue?: number;
  dlq?: number;
}

/**
 * Circuit-breaker state for a single step (keyed by `stepId()` in
 * `Status.breakers`). Tracks consecutive transport failures so a step whose
 * transport is down can be skipped (gated) until a cooldown elapses, instead
 * of every event hammering a known-broken writer.
 *
 * - `closed`: healthy; events pass through. `consecutiveFailures` accrues on
 *   transport failures and resets to 0 on any success.
 * - `open`: tripped; events are skipped until `openUntil`. The first event at
 *   or after `openUntil` transitions to `half-open` and becomes the probe.
 * - `half-open`: a single probe event is allowed through; `probing` marks that
 *   the probe slot is taken so concurrent events still skip. A probe success
 *   closes the breaker; a probe failure re-opens it with a fresh `openUntil`.
 *
 * `consecutiveFailures` is CONSECUTIVE, not cumulative: a single success
 * resets it, so only an unbroken run reaching the threshold opens the breaker.
 */
export interface BreakerState {
  state: 'closed' | 'open' | 'half-open';
  consecutiveFailures: number;
  /** Epoch ms after which an open breaker admits a single probe. */
  openUntil?: number;
  /** True while a half-open probe is in flight (probe slot taken). */
  probing?: boolean;
}

/**
 * Core collector configuration interface
 */
export interface Config {
  /** Whether to run collector automatically */
  run?: boolean;
  /** Static global properties even on a new run */
  globalsStatic: WalkerOS.Properties;
  /** Static session data even on a new run */
  sessionStatic: Partial<SessionData>;
  /** Logger configuration */
  logger?: Logger.Config;
  /**
   * Maximum number of events retained in `collector.queue` for late-registered
   * destination backfill. Overflow drops oldest (FIFO). Default 1000.
   */
  queueMax?: number;
  /** Flow name; keys this flow's entry in event.source.release and the observer flowId. */
  name?: string;
  /** Config release id stamped into event.source.release for this flow. */
  release?: string;
}

/**
 * Initialization configuration that extends Config with initial state
 */
export interface InitConfig extends Partial<Config> {
  /** Initial consent state */
  consent?: WalkerOS.Consent;
  /** Initial user data */
  user?: WalkerOS.User;
  /** Initial global properties */
  globals?: WalkerOS.Properties;
  /** Source configurations */
  sources?: Source.InitSources;
  /** Destination configurations */
  destinations?: Destination.InitDestinations;
  /** Transformer configurations */
  transformers?: Transformer.InitTransformers;
  /** Store configurations */
  stores?: Store.InitStores;
  /** Initial custom properties */
  custom?: WalkerOS.Properties;
  /** Hooks for pipeline observation and interception */
  hooks?: Hooks.Functions;
  /**
   * Observation session connect config, wired by `startFlow` before the run
   * command. The server form attaches a telemetry poster directly from its
   * config trio; the web form attaches only when an `elbObserve` credential
   * is present (URL param or storage slot) and its binding matches. Purely
   * advisory: nothing on this path can affect event processing.
   */
  observe?: Observe;
  /**
   * Caller-supplied observers, added verbatim to `collector.observers` by
   * `startFlow`. Escape hatch for custom emit targets; same advisory
   * contract as every observer (thrown values are swallowed by emitStep).
   */
  observers?: ObserverFn[];
}

export interface SessionData extends WalkerOS.Properties {
  isStart: boolean;
  storage: boolean;
  id?: string;
  start?: number;
  marketing?: true;
  updated?: number;
  isNew?: boolean;
  device?: string;
  count?: number;
  runs?: number;
}

export interface Status {
  startedAt: number;
  in: number;
  out: number;
  failed: number;
  sources: Record<string, SourceStatus>;
  destinations: Record<string, DestinationStatus>;
  /**
   * Monotonic counts of events dropped due to buffer caps, keyed by
   * stepId. See `stepId()` for key construction.
   *
   * Examples:
   *  - `dropped["collector"]?.queue`: collector replay buffer drops
   *  - `dropped["destination.ga4"]?.queue`: ga4's consent-denied buffer drops
   *  - `dropped["destination.ga4"]?.dlq`: ga4's dead-letter queue drops
   */
  dropped: Record<string, DroppedCounters>;
  /**
   * Per-step circuit-breaker state, keyed by stepId. See `stepId()` for key
   * construction; keyed step-agnostically (NOT embedded in
   * `DestinationStatus`) so the breaker can guard any step kind, though
   * destinations are the primary use today. A breaker is created lazily on
   * first accounting and stays inert unless its step is configured with a
   * `breaker` (presence-gated): existing flows never trip a breaker.
   *
   * A runtime status field, not drift-guarded (it is observed, never authored
   * in a flow config).
   *
   * Example:
   *  - `breakers["destination.bigquery"]`: bigquery's consecutive-failure gate.
   */
  breakers: Record<string, BreakerState>;
  /**
   * Monotonic counts of out-of-band connection-level errors reported by a
   * step via `context.reportError(err)` with no event (an orphan error from
   * an EventEmitter SDK object's `'error'` handler), keyed by stepId. See
   * `stepId()` for key construction; mirrors `dropped`.
   *
   * Distinct from `failed`: `failed` counts events lost in-band (a push that
   * threw, a DLQ'd entry). `connectionErrors` counts connection faults that
   * did not lose a specific event at the moment they fired. Operators read
   * both: a rising `connectionErrors` with flat `failed` means a writer is
   * flapping but events are still landing; both rising means the fault is
   * now dropping events.
   *
   * Example:
   *  - `connectionErrors["destination.bigquery"]`: BigQuery stream writer
   *    `'error'` events reported between pushes.
   */
  connectionErrors: Record<string, number>;
}

export interface SourceStatus {
  count: number;
  lastAt?: number;
  duration: number;
}

export interface DestinationStatus {
  count: number;
  failed: number;
  lastAt?: number;
  duration: number;
  /** Current size of the destination's queuePush buffer (point-in-time). */
  queuePushSize: number;
  /** Current size of the destination's DLQ (point-in-time). */
  dlqSize: number;
  /**
   * Number of events buffered in batch scheduler windows but not yet
   * delivered to `pushBatch`. Incremented on enqueue, decremented on
   * flush (whether the flush succeeds or fails). Operators read this
   * to spot batches that never drain.
   */
  inFlightBatch?: number;
}

export interface Sources {
  [id: string]: Source.Instance;
}

export interface Destinations {
  [id: string]: Destination.Instance;
}

export interface Transformers {
  [id: string]: Transformer.Instance;
}

export interface Stores {
  [id: string]: Store.Instance;
}

export type CommandType =
  | 'action'
  | 'config'
  | 'consent'
  | 'context'
  | 'destination'
  | 'elb'
  | 'globals'
  | 'hook'
  | 'init'
  | 'link'
  | 'run'
  | 'user'
  | 'walker'
  | string;

/**
 * Options passed to collector.push() from sources.
 * NOT a Context - just push metadata.
 */
export interface PushOptions {
  id?: string;
  ingest?: Ingest;
  respond?: import('../respond').RespondFn;
  mapping?: Mapping.Config;
  preChain?: string[];
  include?: string[];
  exclude?: string[];
}

/**
 * Push function signature - handles events only
 */
export interface PushFn {
  (
    event: WalkerOS.DeepPartialEvent,
    options?: PushOptions,
  ): Promise<ElbTypes.PushResult>;
}

/**
 * Command function signature - handles walker commands only
 */
export interface CommandFn {
  (command: 'config', config: Partial<Config>): Promise<ElbTypes.PushResult>;
  (command: 'consent', consent: WalkerOS.Consent): Promise<ElbTypes.PushResult>;
  <T extends Destination.Types>(
    command: 'destination',
    init: Destination.Init<T>,
  ): Promise<ElbTypes.PushResult>;
  <K extends keyof Hooks.Functions>(
    command: 'hook',
    init: { name: K; fn: Hooks.Functions[K] },
  ): Promise<ElbTypes.PushResult>;
  (
    command: 'on',
    init: {
      type: On.Types;
      rules: WalkerOS.SingleOrArray<On.Subscription>;
    },
  ): Promise<ElbTypes.PushResult>;
  (command: 'user', user: WalkerOS.User): Promise<ElbTypes.PushResult>;
  (
    command: 'run',
    runState?: {
      consent?: WalkerOS.Consent;
      user?: WalkerOS.User;
      globals?: WalkerOS.Properties;
      custom?: WalkerOS.Properties;
    },
  ): Promise<ElbTypes.PushResult>;
  (command: string, data?: unknown): Promise<ElbTypes.PushResult>;
}

/**
 * Per-cascade tracking for the bounded recursion guard (see `Instance.cascade`).
 * `counts` maps a subscriber identity object to per-cell-type delivery counts
 * within one top-level command's cascade. A pair is stopped once its count
 * exceeds the guard's bound; the non-convergence error logs once per pair on the
 * crossing transition.
 */
export interface Cascade {
  counts: WeakMap<object, Record<string, number>>;
}

// Main Collector interface
export interface Instance {
  push: PushFn;
  command: CommandFn;
  /** Flexible elb() adapter: routes `walker *` to command, events to push. */
  elb: ElbTypes.Fn;
  allowed: boolean;
  config: Config;
  consent: WalkerOS.Consent;
  custom: WalkerOS.Properties;
  sources: Sources;
  destinations: Destinations;
  transformers: Transformers;
  stores: Stores;
  globals: WalkerOS.Properties;
  hooks: Hooks.Functions;
  /**
   * First-class observation channel. The runtime self-emits FlowState
   * records at canonical step sites (collector.push, destination.push,
   * destination.init, destination.pushBatch, destination consent skip,
   * transformer.push, store.get/set/delete, store cache HIT/MISS).
   * Observers run synchronously inside emitStep; thrown values are
   * swallowed. Subscribers add/remove via the standard Set API.
   */
  observers: Set<ObserverFn>;
  /**
   * Optional observation-level supplier installed by bundle codegen. Returns
   * the level currently active for this runtime. Absent means no capture. At
   * `trace` the per-event destination push wraps its env (via `wrapEnv`) to
   * record a destination's declared vendor `calls`; `off`/`standard` and
   * absence leave the push path untouched (zero added per-push cost).
   */
  observeLevel?: () => 'off' | 'standard' | 'trace';
  logger: Logger.Instance;
  on: On.OnConfig;
  queue: WalkerOS.Events;
  round: number;
  /** Run-scoped W3C trace id, minted on each run and stamped onto events. */
  trace?: string;
  /** Static flow name; keys source.release and the observer flowId. */
  name?: string;
  /** Static config release id stamped into source.release for this flow. */
  release?: string;
  /** Per-run emission sequence; reset on each run, incremented per stamped event. */
  count: number;
  /**
   * Monotonic counter bumped on every accepted reactive-state mutation
   * (consent, user, globals, custom). Used for per-subscriber high-water-mark
   * dedup. Not bumped for non-reactive config changes.
   */
  stateVersion: number;
  /**
   * Per-cell change version: the `stateVersion` at which each state cell
   * (`consent`/`user`/`globals`/`custom`) last changed. Lets delivery dedup be
   * per-cell — a subscriber owed two cells at the same `stateVersion` receives
   * both, because each cell's freshness is tracked independently rather than
   * against the single global `stateVersion`. A missing entry reads as 0.
   */
  cellVersion: Record<string, number>;
  /**
   * Per-subscriber, per-cell high-water mark registry for exactly-once state
   * delivery. Keys are subscriber identity objects (a ConsentRule object, a
   * generic-fn, or a source instance); the inner record maps each state-cell
   * type (`consent`/`user`/`globals`/`custom`) to the `stateVersion` at which
   * that subscriber was last invoked FOR THAT CELL. A missing entry means never
   * delivered (sentinel "-infinity", read as -1). A subscriber is invoked for a
   * cell iff `stateVersion > mark[cell]` AND `allowed === true`.
   *
   * Per-cell (not a single scalar per subscriber) so a handler owed two
   * distinct cells at the same `stateVersion` — e.g. consent and user both
   * bumped before run — receives both at the run barrier instead of the first
   * delivery advancing one mark and swallowing the second cell's edge.
   */
  delivery: WeakMap<object, Record<string, number>>;
  /**
   * Transient per-cascade tracking for the bounded recursion guard. A
   * top-level state command creates this when it first enters the delivery
   * cascade and tears it down when it returns; nested commands emitted by
   * reacting callbacks reuse the same structure. It counts deliveries per
   * `(subscriber, cell-type)` so a cyclic cascade terminates (and logs once)
   * instead of recursing until stack overflow. `undefined` between top-level
   * commands. See `on.ts` `cascadeAllow`.
   *
   * This tracker, together with `stateVersion` and `delivery`, assumes top-level
   * state commands are processed serially on a given collector. Concurrent,
   * overlapping state commands on one shared collector are not supported (web is
   * serial; the server per-request path is event push, not state commands).
   */
  cascade?: Cascade;
  session: undefined | SessionData;
  status: Status;
  timing: number;
  user: WalkerOS.User;
  pending: {
    destinations: Destination.InitDestinations;
  };
  /**
   * Set true on the first `shutdown` command, guarding re-entrancy: a second
   * `walker shutdown` must not re-run `destroyAllSteps` and double-close
   * writers, destinations, or stores. Subsequent shutdown commands no-op.
   * Initialized to `false` by the collector factory; absence (`undefined`)
   * is treated as "not yet shut down", so the first shutdown still runs.
   */
  hasShutdown?: boolean;
  /**
   * Every event type ever broadcast through `onApply` (state, lifecycle, and
   * arbitrary). Lets a `require:[<arbitrary>]` gate be satisfied by the current
   * recorded state for events that have no backing cell, including a broadcast
   * that fired before the requiring step registered.
   */
  seenEvents: Set<string>;
}
