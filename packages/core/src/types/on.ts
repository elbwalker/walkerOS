import type { Collector, WalkerOS } from './';

// collector state for the on actions
export type Config = {
  consent?: Array<ConsentConfig>;
  ready?: Array<ReadyConfig>;
  run?: Array<RunConfig>;
  session?: Array<SessionConfig>;
};

// On types
export type Types = keyof Config;

// Map each event type to its expected context type
export interface EventContextMap {
  consent: WalkerOS.Consent;
  session: Collector.SessionData;
  ready: undefined;
  run: undefined;
}

// Extract the context type for a specific event
export type EventContext<T extends Types> = EventContextMap[T];

// Union of all possible context types
export type AnyEventContext = EventContextMap[keyof EventContextMap];

// Legacy context interface (can be removed in future)
export interface Context {
  consent?: WalkerOS.Consent;
  session?: unknown;
}

// Parameters for the onAction function calls
export type Options = ConsentConfig | ReadyConfig | RunConfig | SessionConfig;

// Consent
export interface ConsentConfig {
  [key: string]: ConsentFn;
}
export type ConsentFn = (
  collector: Collector.Instance,
  consent: WalkerOS.Consent,
) => void;

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

export interface OnConfig {
  consent?: ConsentConfig[];
  ready?: ReadyConfig[];
  run?: RunConfig[];
  session?: SessionConfig[];
  [key: string]:
    | ConsentConfig[]
    | ReadyConfig[]
    | RunConfig[]
    | SessionConfig[]
    | undefined;
}

// Destination on function type with automatic type inference
export type OnFn = <T extends Types>(
  event: T,
  context: EventContextMap[T],
) => WalkerOS.PromiseOrValue<void>;

// Runtime-compatible version for internal usage
export type OnFnRuntime = (
  event: Types,
  context: AnyEventContext,
) => WalkerOS.PromiseOrValue<void>;
