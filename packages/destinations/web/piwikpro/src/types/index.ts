import type { Mapping } from '@elbwalker/types';
import type { DestinationWeb } from '@elbwalker/walker.js';

declare global {
  interface Window {
    _paq?: Array<unknown>;
  }
}

export interface Destination
  extends DestinationWeb.Destination<Custom, CustomEvent> {}

export type Config = DestinationWeb.Config<Custom, CustomEvent>;

export interface Custom {
  appId: string;
  // dimensions?: Dimensions;
  linkTracking?: boolean;
  url: string;
}

export interface CustomEvent {
  // dimensions?: Dimensions;
  goalId?: string;
  goalValue?: string;
}

export type EventConfig = Mapping.EventConfig<CustomEvent>;

export interface Dimensions {
  [i: number]: string;
}
