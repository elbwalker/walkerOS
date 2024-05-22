import type { WalkerOS } from './';
import type { SessionData } from '@elbwalker/utils';

// Instance state for the on actions
export type Config = {
  consent?: Array<ConsentConfig>;
  run?: Array<RunConfig>;
  session?: Array<SessionConfig>;
};

// On types
export type Types = keyof Config;

// Function definitions for the on actions
export type Functions = ConsentFn | RunFn | SessionFn;

// Parameters for the onAction function calls
export type Options = ConsentConfig | RunConfig | SessionConfig;

// Consent
export interface ConsentConfig {
  [key: string]: ConsentFn;
}
export type ConsentFn = (
  instance: WalkerOS.Instance,
  consent: WalkerOS.Consent,
) => void;

// Run
export type RunConfig = RunFn;
export type RunFn = (instance: WalkerOS.Instance) => void;

// Session
export type SessionConfig = SessionFn;
export type SessionFn = (
  instance: WalkerOS.Instance,
  session: SessionData,
) => void;
