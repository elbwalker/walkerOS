import type { WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    dataLayer: Array<unknown> | unknown;
  }
}

export interface Destination
  extends WebDestination.Destination<Custom, CustomEvent> {}

export type Config = WebDestination.Config<Custom, CustomEvent>;

export interface Custom {
  containerId?: string; // GTM-XXXXXXX
  dataLayer?: string; // dataLayer
  domain?: string; // Source domain of the GTM
}

export interface CustomEvent {}
