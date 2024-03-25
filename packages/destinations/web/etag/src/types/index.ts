import type { WebDestination } from '@elbwalker/walker.js';

export interface Destination
  extends WebDestination.Destination<CustomConfig, CustomEventConfig> {}

export type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

export interface CustomConfig {
  measurementId: string; // Measurement ID
  url?: string; // URL to send the request to
  params?: Partial<Parameters>; // Customize the parameters
  clientId?: string; // Fallback client ID
}

export interface CustomEventConfig {}

export interface Parameters {
  v: string;
  tid: string;
  gcs: string;
  gcd: string;
  _p: string;
  cid: string;
  [key: string]: string;
}
