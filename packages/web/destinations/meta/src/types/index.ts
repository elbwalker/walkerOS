import type { Mapping } from '@walkerOS/types';
import type { DestinationWeb } from '@walkerOS/web-collector';

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
}

export interface CustomEvent {
  track?: StandardEventNames; // Name of a standard event to track
  trackCustom?: string; // Name of a custom event to track
}

export type EventConfig = Mapping.EventConfig<CustomEvent>;

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
