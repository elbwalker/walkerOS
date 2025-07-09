import type { WalkerOS } from '@walkerOS/types';

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
  collector: WalkerOS.Collector,
  consent: WalkerOS.Consent,
) => void;

// Ready
export type ReadyConfig = ReadyFn;
export type ReadyFn = (collector: WalkerOS.Collector) => void;

// Run
export type RunConfig = RunFn;
export type RunFn = (collector: WalkerOS.Collector) => void;

// Session
export type SessionConfig = SessionFn;
export type SessionFn = (
  collector: WalkerOS.Collector,
  session?: WalkerOS.SessionData,
) => void;
