import type { Collector, Destination, WalkerOS } from './';

// collector state for the on actions
export type Config = {
  config?: Array<GenericConfig>;
  consent?: Array<ConsentConfig>;
  custom?: Array<GenericConfig>;
  globals?: Array<GenericConfig>;
  ready?: Array<ReadyConfig>;
  run?: Array<RunConfig>;
  session?: Array<SessionConfig>;
  user?: Array<UserConfig>;
};

// On types — allow arbitrary string events via `(string & {})`
export type Types = keyof Config | (string & {});

// Map each event type to its expected context type
export interface EventContextMap {
  config: Partial<Collector.Config>;
  consent: WalkerOS.Consent;
  custom: WalkerOS.Properties;
  globals: WalkerOS.Properties;
  ready: undefined;
  run: undefined;
  session: Collector.SessionData;
  user: WalkerOS.User;
}

// Extract the context type for a specific event
export type EventContext<T extends keyof EventContextMap> = EventContextMap[T];

// Union of all possible context types
export type AnyEventContext = EventContextMap[keyof EventContextMap];

// Legacy context interface (can be removed in future)
export interface Context {
  consent?: WalkerOS.Consent;
  session?: unknown;
}

// Parameters for the onAction function calls
export type Options =
  | ConsentConfig
  | GenericConfig
  | ReadyConfig
  | RunConfig
  | SessionConfig
  | UserConfig;

// Consent
export interface ConsentConfig {
  [key: string]: ConsentFn;
}
export type ConsentFn = (
  collector: Collector.Instance,
  consent: WalkerOS.Consent,
) => void;

// Generic (config, custom, globals)
export type GenericConfig = GenericFn;
export type GenericFn = (collector: Collector.Instance, data: unknown) => void;

// Ready
export type ReadyConfig = ReadyFn;
export type ReadyFn = (collector: Collector.Instance) => void;

// Run
export type RunConfig = RunFn;
export type RunFn = (collector: Collector.Instance) => void;

// Session
export type SessionConfig = SessionFn;
export type SessionFn = (
  collector: Collector.Instance,
  session?: unknown,
) => void;

// User
export type UserConfig = UserFn;
export type UserFn = (
  collector: Collector.Instance,
  user: WalkerOS.User,
) => void;

export interface OnConfig {
  config?: GenericConfig[];
  consent?: ConsentConfig[];
  custom?: GenericConfig[];
  globals?: GenericConfig[];
  ready?: ReadyConfig[];
  run?: RunConfig[];
  session?: SessionConfig[];
  user?: UserConfig[];
  [key: string]:
    | ConsentConfig[]
    | GenericConfig[]
    | ReadyConfig[]
    | RunConfig[]
    | SessionConfig[]
    | UserConfig[]
    | undefined;
}

// Destination on function type with automatic type inference
export type OnFn<T extends Destination.TypesGeneric = Destination.Types> = (
  type: Types,
  context: Destination.Context<T>,
) => WalkerOS.PromiseOrValue<void>;

// Runtime-compatible version for internal usage
export type OnFnRuntime = (
  type: Types,
  context: Destination.Context,
) => WalkerOS.PromiseOrValue<void>;
