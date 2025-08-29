import type { Mapping as WalkerOSMapping, Elb } from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

declare global {
  // Augment the global WalkerOS namespace with destination-specific types
  namespace WalkerOS {
    interface Elb extends Elb.RegisterDestination<Destination, Config> {}
  }

  interface Window {
    _fbq?: facebook.Pixel.Event;
    fbq?: facebook.Pixel.Event;
  }
}

// Meta-specific environment that includes fbq
export interface MetaEnvironment {
  window: {
    fbq: facebook.Pixel.Event;
    _fbq?: facebook.Pixel.Event;
  };
  document: Document;
}

export type Destination = DestinationWeb.Destination<Settings, Mapping>;
export type Config = DestinationWeb.Config<Settings, Mapping>;

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
