import type { WebDestination } from '@elbwalker/client-web';
import type { Elbwalker } from '@elbwalker/types';

declare global {
  interface Window {
    _fbq?: facebook.Pixel.Event;
    fbq?: facebook.Pixel.Event;
  }
}

export interface Function
  extends WebDestination.Function<CustomConfig, CustomEventConfig> {}

export type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

export interface CustomConfig {
  pixelId?: string; // Required pixel id
  currency?: string; // Default currency is EUR
  pageview?: boolean; // Send the PageView event (default yes, deactivate actively)
}

export interface CustomEventConfig {
  content_ids?: string; // Name of data property key to use in content_ids
  content_name?: string; // Name of data property key to use as content_name
  content_type?: string; // Name of data property key to use as content_type
  track?: StandardEventNames; // Name of a standard event to track
  value?: string; // Name of data property key to use for value
  contents?: ParamContents; // Value(s) to be used for contents
}

export type PropertyMapping = string | PropertyMappingValue;

export interface PropertyMappingValue {
  key: string;
  default?: Elbwalker.PropertyType;
}

export interface ParamContents {
  id: PropertyMapping;
  quantity: PropertyMapping;
}

export type ContentIds =
  | facebook.Pixel.DPA.ViewContentParameters['content_ids']
  | facebook.Pixel.DPA.AddToCartParameters['content_ids']
  | facebook.Pixel.DPA.PurchaseParameters['content_ids'];
export type Contents = facebook.Pixel.ViewContentParameters['contents'];

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
  | 'ViewContent';

export type Parameters =
  | facebook.Pixel.ViewContentParameters
  | facebook.Pixel.ViewContentParameters
  | facebook.Pixel.SearchParameters
  | facebook.Pixel.AddToCartParameters
  | facebook.Pixel.AddToWishlistParameters
  | facebook.Pixel.InitiateCheckoutParameters
  | facebook.Pixel.AddPaymentInfoParameters
  | facebook.Pixel.PurchaseParameters
  | facebook.Pixel.LeadParameters
  | facebook.Pixel.CompleteRegistrationParameters;

export interface StartSubscribeParameters {
  currency?: string;
  predicted_ltv?: number;
  value?: number;
}
