import type { WalkerOS } from '@elbwalker/types';
import type { SendHeaders } from '@elbwalker/utils';
import type { WebDestination } from '@elbwalker/walker.js';

export interface Destination
  extends WebDestination.Destination<CustomConfig, CustomEventConfig> {}

export type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

export interface CustomConfig extends State {
  measurementId: string; // Measurement ID
  debug?: boolean; // Enables debug mode
  url?: string; // URL to send the request to
  headers?: SendHeaders; // Custom headers
  params?: Partial<Parameters>; // Customize the parameters
  paramsEvent?: Partial<ParametersEvent>; // Customize the event parameters
}

export interface CustomEventConfig {}

export interface State {
  count?: number; // Sent events count
  lastEngagement?: number; // Last event timestamp
  isEngaged?: boolean; // If a user is engaged
  sentPageView?: boolean; // If a page view has been sent
  sentSession?: boolean; // If session parameters have been sent
}

export interface Parameters extends Partial<ParametersOptional> {
  v: '2'; // Protocol version, always 2 for GA4
  tid: string; // MeasurementID
  cid: string; // Client ID
  _p: number; // Cache buster
  [key: string]: string | number | undefined;
}

export interface ParametersOptional extends ParametersSession {
  _z?: string; // Transport
  _dbg?: 1; // Debug mode
  dl?: string; // Document location
  dt?: string; // Document title
  dr?: string; // Document referrer
  tfd?: number; // Time to first byte
  ul?: string; // User language
}

export interface ParametersEvent extends WalkerOS.AnyObject {
  en: string; // Event name
  _et: number; // Engagement time (for realtime view)
  _ee?: 1; // Enhanced Measurement Flag
  [key: `ep.${string}`]: string; // string parameters
  [key: `epn.${string}`]: number; // number parameters
}

export interface ParametersConsent {
  gcs?: string; // Consent mode status
  gcd?: string; // Consent mode default
  dma?: number; // Digital Markets Act
  dma_cps?: string; // Consent mode data processing
  pscdl?: string; // Privacy Sandbox
}

export interface ParametersBrowser extends WalkerOS.AnyObject {
  uaa?: string; // Architecture
  uab?: number; // Bitness
  uafvl?: string; // Full version list
  uamb?: number; // Mobile
  uap?: string; // Platform
  uapv?: string; // Platform version
  ul?: string; // User language
}

export interface ParametersDevice extends WalkerOS.AnyObject {
  sr?: string; // Screen resolution
}

export interface ParametersSession {
  sid: number; // Session ID
  _nsi?: 1; // New to site
  _fv?: 1 | 2; // First visit
  _ss?: 1 | 2; // Session start
  sct?: number; // Session count
  seg?: 1; // Session engaged
}
