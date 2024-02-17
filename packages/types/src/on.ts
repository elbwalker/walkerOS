import { WalkerOS } from './';

// Instance state for the on actions
export type Config = {
  consent?: Array<ConsentConfig>;
  run?: Array<RunConfig>;
};

// On types
export type Types = keyof Config;

// Function definitions for the on actions
export type Functions = ConsentFn | RunFn;

// Parameters for the onAction function calls
export type Options = ConsentConfig | RunConfig;

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
export type RunFn = (instance: WalkerOS.Instance) => void; // @TODO return custom config?
