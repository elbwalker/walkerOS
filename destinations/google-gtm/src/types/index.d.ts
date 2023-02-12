import { WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    dataLayer: Array<unknown>;
  }
}

export declare namespace DestinationGTM {
  interface Function
    extends WebDestination.Function<CustomConfig, CustomEventConfig> {}

  type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

  interface CustomConfig {
    containerId?: string; // GTM-XXXXXXX
    dataLayer?: string; // dataLayer
    domain?: string; // Source domain of the GTM
  }

  interface CustomEventConfig {}
}
