import { WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    _fbq?: facebook.Pixel.Event;
    fbq?: facebook.Pixel.Event;
  }
}

export declare namespace DestinationMetaPixel {
  interface Function
    extends WebDestination.Function<CustomConfig, CustomEventConfig> {}

  type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

  interface CustomConfig {
    pixelId?: string; // Required pixel id
    currency?: string; // Default currency is EUR
    pageview?: boolean; // Send the PageView event (default yes, deactivate actively)
  }

  interface CustomEventConfig {
    id?: string; // Name of data property key to use in content_ids
    name?: string; // Name of data property key to use as content_name
    track?: StandardEventNames; // Name of a standard event to track
    value?: string; // Name of data property key to use for value
  }

  type StandardEventNames =
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
    | 'ViewContent';

  interface StartSubscribeParameters {
    currency?: string;
    predicted_ltv?: number;
    value?: number;
  }
}
