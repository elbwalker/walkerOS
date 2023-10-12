import type { WebDestination } from '@elbwalker/client-web';

declare global {
  interface Window {
    dataLayer: Array<unknown> | unknown;
  }
}

export interface Function
  extends WebDestination.Function<CustomConfig, CustomEventConfig> {}

export type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

export interface CustomConfig {
  containerId?: string; // GTM-XXXXXXX
  dataLayer?: string; // dataLayer
  domain?: string; // Source domain of the GTM
}

export interface CustomEventConfig {}
