import { WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    plausible?: any;}
}

export declare namespace DestinationPlausible {
  interface Function
    extends WebDestination.Function<CustomConfig, CustomEventConfig> {}

  type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

  interface CustomConfig {
    domain?: string; // Name of the domain to be tracked
  }

  interface CustomEventConfig {}
}
