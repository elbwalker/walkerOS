import type { WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    plausible?: any;
  }
}

export interface Destination
  extends WebDestination.Destination<CustomConfig, CustomEventConfig> {}

export type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

export interface CustomConfig {
  domain?: string; // Name of the domain to be tracked
}

export interface CustomEventConfig {}
