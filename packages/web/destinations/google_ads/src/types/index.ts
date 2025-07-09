import type { Mapping as WalkerOSMapping } from '@walkerOS/core';
import type { DestinationWeb } from '@walkerOS/web-collector';

declare global {
  interface Window {
    dataLayer: Array<unknown> | unknown;
    gtag?: Gtag.Gtag;
  }
}

export type Destination = DestinationWeb.Destination<Settings, Mapping>;
export type Config = DestinationWeb.Config<Settings, Mapping>;

// Destination-specific settings (internal usage)
export interface Settings {
  conversionId?: string; // The ads accounts id used for every conversion
  currency?: string; // Default currency is EUR
}

// Single event transformation rule
export interface Mapping {}

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
