import type { WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    _paq?: Array<unknown>;
  }
}

export interface Destination
  extends WebDestination.Destination<Custom, CustomEvent> {}

export type Config = WebDestination.Config<Custom, CustomEvent>;

export interface Custom {
  appId: string;
  // dimensions?: Dimensions;
  linkTracking?: boolean;
  pageview?: boolean;
  url: string;
}

export interface CustomEvent {
  // dimensions?: Dimensions;
  goalId?: string;
  goalValue?: string;
  name?: string;
  value?: string;
}

export interface Dimensions {
  [i: number]: string;
}
