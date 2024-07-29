import type { WalkerOS } from '@elbwalker/types';

// Instance state for the on actions
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
  instance: WalkerOS.Instance,
  consent: WalkerOS.Consent,
) => void;

// Ready
export type ReadyConfig = ReadyFn;
export type ReadyFn = (instance: WalkerOS.Instance) => void;

// Run
export type RunConfig = RunFn;
export type RunFn = (instance: WalkerOS.Instance) => void;

// Session
export type SessionConfig = SessionFn;
export type SessionFn = (
  instance: WalkerOS.Instance,
  session?: WalkerOS.SessionData,
) => void;
