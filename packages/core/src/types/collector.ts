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
import type { ObserverFn } from './observer';

/** Identifies which kind of step a stepId belongs to. */
export type StepKind = 'collector' | 'source' | 'transformer' | 'destination';

/**
 * Build a stepId for use as a key in `Status.dropped` (and future
 * status maps). The collector-level stepId is the literal "collector"
 * (no id). Source/transformer/destination ids take the form
 * `"<kind>.<id>"`, e.g. `"destination.ga4"`.
 *
 * The dot separator mirrors the vocabulary already used in collector
 * log messages ("collector.queue overflow", "destination.dlq overflow").
 */
export function stepId(kind: 'collector'): 'collector';
export function stepId(
  kind: 'source' | 'transformer' | 'destination',
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

// Main Collector interface
export interface Instance {
  push: PushFn;
  command: CommandFn;
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
  logger: Logger.Instance;
  on: On.OnConfig;
  queue: WalkerOS.Events;
  round: number;
  session: undefined | SessionData;
  status: Status;
  timing: number;
  user: WalkerOS.User;
  pending: {
    destinations: Destination.InitDestinations;
  };
}
