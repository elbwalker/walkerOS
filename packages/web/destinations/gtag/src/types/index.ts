import type { Mapping as WalkerOSMapping } from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

// Extend Window interface with specific dataLayer typing
interface WindowWithDataLayer extends Window {
  dataLayer: unknown[];
  gtag?: Gtag.Gtag;
  [key: string]: unknown; // For custom dataLayer names and other properties
}

declare global {
  interface Window {
    gtag?: Gtag.Gtag;
    [key: string]: unknown; // For custom dataLayer names and other properties
  }
}

export type Destination = DestinationWeb.Destination<Settings, Mapping>;
export type Config = DestinationWeb.Config<Settings, Mapping>;

// Unified settings for all Google tools
export interface Settings {
  // GA4 settings
  ga4?: GA4Settings;
  // Google Ads settings
  ads?: AdsSettings;
  // GTM settings
  gtm?: GTMSettings;
}

// GA4-specific settings
export interface GA4Settings {
  measurementId: string;
  debug?: boolean;
  include?: Include;
  pageview?: boolean;
  server_container_url?: string;
  snakeCase?: boolean;
  transport_url?: string;
}

// Google Ads specific settings
export interface AdsSettings {
  conversionId: string;
  currency?: string;
}

// Google Ads specific mapping
export interface AdsMapping {
  label?: string; // Conversion label for this specific event
}

// GTM specific settings
export interface GTMSettings {
  containerId: string;
  dataLayer?: string;
  domain?: string;
}

// Unified mapping interface
export interface Mapping {
  ga4?: GA4Mapping;
  ads?: AdsMapping;
  gtm?: GTMMapping;
}

// GA4-specific mapping
export interface GA4Mapping {
  include?: Include;
}

// GTM specific mapping
export interface GTMMapping {}

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
export type Param = WalkerOSMapping.Value;

export type Include = Array<
  | 'all'
  | 'context'
  | 'data'
  | 'event'
  | 'globals'
  | 'source'
  | 'user'
  | 'version'
>;

export type Parameters = Gtag.ControlParams &
  Gtag.EventParams &
  Gtag.CustomParams;
