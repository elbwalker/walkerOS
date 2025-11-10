import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

declare global {
  interface Window {
    _fbq?: facebook.Pixel.Event;
    fbq?: facebook.Pixel.Event;
  }
}

export interface Settings {
  pixelId: string;
}

export interface Mapping {
  track?: StandardEventNames;
  trackCustom?: string;
}

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

export type Types = CoreDestination.Types<Settings, Mapping, Env>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;

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
