import type { WalkerOS } from '@elbwalker/types';

// Instance state for the on actions
export type Config = WalkerOS.OnConfig;

// Parameters for the onAction function calls
export type Options = ConsentConfig | ReadyConfig | RunConfig;

// Consent
export interface ConsentConfig {
  [key: string]: ConsentFn;
}
export type ConsentFn = (
  instance: WalkerOS.Instance,
  consent: WalkerOS.Consent,
) => void;

// Ready
export interface ReadyConfig {
  [key: string]: ReadyFn;
}
export type ReadyFn = (instance: WalkerOS.Instance) => void;

// Run
export interface RunConfig {
  [key: string]: RunFn;
}
export type RunFn = (instance: WalkerOS.Instance) => void;
