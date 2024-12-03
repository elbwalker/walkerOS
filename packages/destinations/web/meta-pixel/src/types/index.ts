import type { Mapping } from '@elbwalker/types';
import type { DestinationWeb } from '@elbwalker/walker.js';

declare global {
  interface Window {
    _fbq?: facebook.Pixel.Event;
    fbq?: facebook.Pixel.Event;
  }
}

export interface Destination
  extends DestinationWeb.Destination<Custom, CustomEvent> {}

export type Config = DestinationWeb.Config<Custom, CustomEvent>;

export interface Custom {
  pixelId?: string; // Required pixel id
  currency?: string; // Default currency is EUR
  pageview?: boolean; // Send the PageView event (default yes, deactivate actively)
  loadScript?: boolean; // Whether to load the Meta Pixel script
}

export interface CustomEvent {
  track?: StandardEventNames; // Name of a standard event to track
  trackCustom?: string; // Name of a custom event to track
  parameters?: Mapping.Map; // Mapping of parameters for fbq
}

export type StandardEventNames =
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
