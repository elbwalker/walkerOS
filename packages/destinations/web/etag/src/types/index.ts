import type { WebDestination } from '@elbwalker/walker.js';

export interface Destination
  extends WebDestination.Destination<CustomConfig, CustomEventConfig> {}

export type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

export interface CustomConfig {
  measurementId: string; // Measurement ID
  url?: string; // URL to send the request to
  params?: Partial<Parameters>; // Customize the parameters
}

export interface CustomEventConfig {}

export interface Parameters extends Partial<ParametersOptional> {
  v: '2'; // Protocol version, always 2 for GA4
  tid: string; // MeasurementID
  gcs: string; // Consent mode status
  gcd: string; // Consent mode default
  _p: string; // Cache buster
  cid: string; // Client ID
  en: string; // Event name
  sid: number; // Session ID
  [key: string]: string | number | undefined;
}

export interface ParametersOptional {
  _fv?: 1; // First visit
  _ss?: 1; // Session start
  sct?: number; // Session count
  _et?: number; // Engagement time
  dl?: string; // Document location
  dt?: string; // Document title
  dr?: string; // Document referrer
  ul?: string; // User language
}
