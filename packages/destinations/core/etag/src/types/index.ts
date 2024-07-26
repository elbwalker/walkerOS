export interface CustomConfig extends State {
  measurementId: string; // Measurement ID
  debug?: boolean; // Enables debug mode
  url?: string; // URL to send the request to
  headers?: SendHeaders; // Custom headers
  params?: Partial<ParametersBasic>; // Customize the parameters
  paramsEvent?: Partial<ParametersEvent>; // Customize the event parameters
}

import type { WalkerOS } from '@elbwalker/types';
import type { SendHeaders } from '@elbwalker/utils';

export interface Config extends Partial<State> {
  measurementId: string; // Measurement ID
  debug?: boolean; // Enables debug mode
  url?: string; // URL to send the request to
  headers?: SendHeaders; // Custom headers
  params?: Partial<ParametersRequest>; // Customize the parameters
  paramsEvent?: Partial<ParametersEvent>; // Customize the event parameters
}

export interface State {
  lastEngagement: number; // Last event timestamp
  isEngaged: boolean; // If a user is engaged
}

export interface Context {
  language?: string;
  pageTitle?: string;
  session?: WalkerOS.SessionData;
  userAgent?: string;
}

export interface RequestData {
  body?: string;
  path: WalkerOS.AnyObject;
}

export type ParametersRequest = ParametersBasic &
  ParametersBrowser &
  ParametersConsent &
  ParametersDevice &
  ParametersDocument &
  ParametersSession;

export interface ParametersBasic {
  v: '2'; // Protocol version, always 2 for GA4
  tid: string; // MeasurementID
  cid: string; // Client ID
  _s: number; // Event sequence number
  _p: number; // Cache buster
  _z?: string; // Transport
  _dbg?: 1; // Debug mode
  tfd?: number; // Time to first byte
}

export interface ParametersBrowser {
  uaa?: string; // Architecture
  uab?: number; // Bitness
  uafvl?: string; // Full version list
  uamb?: number; // Mobile
  uap?: string; // Platform
  uapv?: string; // Platform version
  ul?: string; // User language
}

export interface ParametersConsent {
  gcs?: string; // Consent mode status
  gcd?: string; // Consent mode default
  dma?: number; // Digital Markets Act
  dma_cps?: string; // Consent mode data processing
  pscdl?: string; // Privacy Sandbox
}

export interface ParametersDevice {
  sr?: string; // Screen resolution
}

export interface ParametersDocument {
  dl?: string; // Document location
  dt?: string; // Document title
  dr?: string; // Document referrer
}

export interface ParametersEvent {
  en: string; // Event name
  _et: number; // Engagement time (for realtime view)
  _ee?: 1; // Enhanced Measurement Flag
  [key: `ep.${string}`]: string; // string parameters
  [key: `epn.${string}`]: number; // number parameters
}

export interface ParametersSession {
  sid: number; // Session ID
  _nsi?: 1; // New to site
  _fv?: 1 | 2; // First visit
  _ss?: 1 | 2; // Session start
  sct?: number; // Session count
  seg?: 1; // Session engaged
}
