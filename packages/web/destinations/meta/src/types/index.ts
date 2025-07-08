import type { Mapping } from '@walkerOS/types';
import type { DestinationWeb } from '@walkerOS/web-collector';

declare global {
  interface Window {
    _fbq?: facebook.Pixel.Event;
    fbq?: facebook.Pixel.Event;
  }
}

export type Destination = DestinationWeb.Destination<Settings, EventMapping>;
export type Config = DestinationWeb.Config<Settings, EventMapping>;

// Destination-specific settings (internal usage)
export interface Settings {
  pixelId?: string; // Required pixel id
}

// Single event transformation rule
export interface EventMapping {
  track?: StandardEventNames; // Name of a standard event to track
  trackCustom?: string; // Name of a custom event to track
}

export type EventConfig = Mapping.EventConfig<EventMapping>;

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
