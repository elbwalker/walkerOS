import { WalkerOS } from './';

// Instance state for the on actions
export type Config = {
  consent?: Array<ConsentConfig>;
  load?: Array<LoadConfig>;
};

// On types
export type Types = keyof Config;

// Function definitions for the on actions
export type Functions = ConsentFn | LoadFn;

// Parameters for the onAction function calls
export type Options = ConsentConfig | LoadConfig;

// Consent
export interface ConsentConfig {
  [key: string]: ConsentFn;
}
export type ConsentFn = (
  instance: WalkerOS.Instance,
  consent: WalkerOS.Consent,
) => void;

// Load
export type LoadConfig = LoadFn;
export type LoadFn = (instance: WalkerOS.Instance) => void; // @TODO return custom config?
