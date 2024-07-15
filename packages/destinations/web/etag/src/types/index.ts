import type { WebDestination } from '@elbwalker/walker.js';

export interface Destination
  extends WebDestination.Destination<CustomConfig, CustomEventConfig> {}

export type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

export interface CustomConfig {
  measurementId: string; // Measurement ID
  debug?: true; // Enables debug mode
  url?: string; // URL to send the request to
  params?: Partial<Parameters>; // Customize the parameters
}

export interface CustomEventConfig {}

export interface Parameters extends Partial<ParametersOptional> {
  v: '2'; // Protocol version, always 2 for GA4
  tid: string; // MeasurementID
  gcs?: string; // Consent mode status
  gcd?: string; // Consent mode default
  _p: string; // Cache buster
  cid: string; // Client ID
  en: string; // Event name
  _et: number; // Engagement time (for realtime view)
  sid: number; // Session ID
  [key: string]: string | number | undefined;
}

export interface ParametersOptional {
  _fv?: 1 | 2; // First visit
  _ss?: 1 | 2; // Session start
  _z?: string; // Transport
  _dbg?: 1; // Debug mode
  sct?: number; // Session count
  dl?: string; // Document location
  dt?: string; // Document title
  dr?: string; // Document referrer
  ul?: string; // User language
}
