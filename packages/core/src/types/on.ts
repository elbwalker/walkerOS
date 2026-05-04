import type { Collector, Destination, Logger, WalkerOS } from './';

/** Collector state mapping for the `on` actions. */
export type Config = {
  config?: Array<GenericFn>;
  consent?: Array<ConsentRule>;
  custom?: Array<GenericFn>;
  globals?: Array<GenericFn>;
  ready?: Array<ReadyFn>;
  run?: Array<RunFn>;
  session?: Array<SessionFn>;
  user?: Array<UserFn>;
};

/** Allow arbitrary string events via `(string & {})`. */
export type Types = keyof Config | (string & {});

/** Map each event type to its expected data payload type. */
export interface EventDataMap {
  config: Partial<Collector.Config>;
  consent: WalkerOS.Consent;
  custom: WalkerOS.Properties;
  globals: WalkerOS.Properties;
  ready: void;
  run: void;
  session: Collector.SessionData | undefined;
  user: WalkerOS.User;
}

/** Extract the data type for a specific event. */
export type EventData<T extends keyof EventDataMap> = EventDataMap[T];

/** Union of all possible data types. */
export type AnyEventData = EventDataMap[keyof EventDataMap];

/**
 * Context provided to every `on` callback.
 * Same posture as Mapping.Context: collector + logger only;
 * subscriptions are a collector-level concern, not a stage-level one.
 */
export interface Context {
  collector: Collector.Instance;
  logger: Logger.Instance;
}

/** Unified subscription callback shape. */
export type Fn<TData = unknown> = (
  data: TData,
  context: Context,
) => WalkerOS.PromiseOrValue<void>;

/** Typed-data variants for readability and IntelliSense. All reduce to Fn<TData>. */
export type ConsentFn = Fn<WalkerOS.Consent>;
export type GenericFn = Fn<unknown>;
export type ReadyFn = Fn<void>;
export type RunFn = Fn<void>;
export type SessionFn = Fn<Collector.SessionData | undefined>;
export type UserFn = Fn<WalkerOS.User>;

/**
 * Consent rule: a record of `{ [consentKey]: ConsentFn }`.
 * Only the consent action uses this shape (per-key handler dispatch).
 */
export interface ConsentRule {
  [key: string]: ConsentFn;
}

/** Anything registerable via `walker.on(action, X)`: a typed callback or a consent rule record. */
export type Subscription =
  | ConsentRule
  | GenericFn
  | ReadyFn
  | RunFn
  | SessionFn
  | UserFn;

export interface OnConfig {
  config?: GenericFn[];
  consent?: ConsentRule[];
  custom?: GenericFn[];
  globals?: GenericFn[];
  ready?: ReadyFn[];
  run?: RunFn[];
  session?: SessionFn[];
  user?: UserFn[];
  [key: string]:
    | ConsentRule[]
    | GenericFn[]
    | ReadyFn[]
    | RunFn[]
    | SessionFn[]
    | UserFn[]
    | undefined;
}

/**
 * Destination `on` handler: receives the action type and a destination context.
 * Already context-style; kept for compatibility with the destination interface.
 */
export type OnFn<T extends Destination.TypesGeneric = Destination.Types> = (
  type: Types,
  context: Destination.Context<T>,
) => WalkerOS.PromiseOrValue<void>;

export type OnFnRuntime = (
  type: Types,
  context: Destination.Context,
) => WalkerOS.PromiseOrValue<void>;
