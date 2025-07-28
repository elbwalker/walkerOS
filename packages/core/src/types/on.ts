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
