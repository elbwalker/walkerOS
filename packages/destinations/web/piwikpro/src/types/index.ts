import type { WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    _paq?: Array<unknown>;
  }
}

export interface Function
  extends WebDestination.Function<CustomConfig, CustomEventConfig> {}

export type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

export interface CustomConfig {
  appId: string;
  // dimensions?: Dimensions;
  linkTracking?: boolean;
  pageview?: boolean;
  url: string;
}

export interface CustomEventConfig {
  // dimensions?: Dimensions;
  goalId?: string;
  goalValue?: string;
  name?: string;
  value?: string;
}

export interface Dimensions {
  [i: number]: string;
}
