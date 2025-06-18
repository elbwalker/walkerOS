import type { Mapping } from '@walkerOS/types';
import type { DestinationWeb } from '@elbwalker/walker.js';

declare global {
  interface Window {
    dataLayer: Array<unknown> | unknown;
  }
}

export interface Destination
  extends DestinationWeb.Destination<Custom, CustomEvent> {}

export type Config = DestinationWeb.Config<Custom, CustomEvent>;

export interface Custom {
  containerId?: string; // GTM-XXXXXXX
  dataLayer?: string; // dataLayer
  domain?: string; // Source domain of the GTM
}

export type EventConfig = Mapping.EventConfig<CustomEvent>;

export interface CustomEvent {}
