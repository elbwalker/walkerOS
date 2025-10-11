import type { Mapping as WalkerOSMapping } from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

declare global {
  interface Window {
    _fbq?: facebook.Pixel.Event;
    fbq?: facebook.Pixel.Event;
  }
}

// Meta-specific environment interface
export interface Env extends DestinationWeb.Env {
  window: {
    fbq: facebook.Pixel.Event;
    _fbq?: facebook.Pixel.Event;
  };
  document: {
    createElement: (tagName: string) => Element;
    head: { appendChild: (node: unknown) => void };
  };
}

export type Destination = DestinationWeb.Destination<Settings, Mapping, Env>;
export type Config = DestinationWeb.Config<Settings, Mapping, Env>;

// Destination-specific settings (internal usage)
export interface Settings {
  pixelId?: string; // Required pixel id
}

// Single event transformation rule
export interface Mapping {
  track?: StandardEventNames; // Name of a standard event to track
  trackCustom?: string; // Name of a custom event to track
}

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;

export type StandardEventNames =
  | 'PageView'
  | 'AddPaymentInfo'
  | 'AddToCart'
  | 'AddToWishlist'
  | 'CompleteRegistration'
  | 'Contact'
  | 'CustomizeProduct'
  | 'Donate'
  | 'FindLocation'
  | 'InitiateCheckout'
  | 'Lead'
  | 'Purchase'
  | 'Schedule'
  | 'Search'
  | 'StartTrial'
  | 'SubmitApplication'
  | 'Subscribe'
  | 'ViewContent'
  | string;
