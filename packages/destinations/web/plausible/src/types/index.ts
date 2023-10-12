import type { WebDestination } from '@elbwalker/client-web';

declare global {
  interface Window {
    plausible?: any;
  }
}

export interface Function
  extends WebDestination.Function<CustomConfig, CustomEventConfig> {}

export type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

export interface CustomConfig {
  domain?: string; // Name of the domain to be tracked
}

export interface CustomEventConfig {}
