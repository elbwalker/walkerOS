import type { DestinationNode } from '@elbwalker/source-node';
import type {
  Handler,
  Mapping,
  Destination as WalkerOSDestination,
} from '@elbwalker/types';

export interface Destination
  extends DestinationNode.Destination<Custom, CustomEvent> {
  init: InitFn;
  push: PushFn;
}

export type InitFn = WalkerOSDestination.InitFn<Custom, CustomEvent>;
export type PushFn = WalkerOSDestination.PushFn<Custom, CustomEvent>;

export type Config = {
  custom: Custom;
  onLog: Handler.Log;
} & DestinationNode.Config<Custom, CustomEvent>;

export type EventMapping = DestinationNode.EventMapping<CustomEvent>;

export type PushEvents = DestinationNode.PushEvents<CustomEvent>;

export interface Custom {
  accessToken: string;
  pixelId: string;
  action_source?: ActionSource;
  clickId?: string; // @TODO
  test_event_code?: string;
  url?: string;
  user_data?: Mapping.Map;
}

export interface CustomEvent {}

export type EventConfig = Mapping.EventConfig<CustomEvent>;

// https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/main-body
export interface BodyParameters {
  data: Array<ServerEventParameters>;
  test_event_code?: string;
}

/**
 * Represents the top‑level parameters for a server event sent via Meta's Conversions API.
 * https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event
 */
export interface ServerEventParameters extends StandardParameters {
  /** The event name or custom event identifier. Required for deduplication. */
  event_name: EventName;

  /** Unix timestamp (in seconds) when the event actually occurred. GMT timezone. */
  event_time: number;

  /** Map of customer information for matching (emails, phone, etc.). */
  user_data: CustomerInformationParameters;

  /** Additional business data about the event. */
  custom_data?: Record<string, unknown>;

  /** URL of the page where the event occurred. */
  event_source_url?: string;

  /** If true, exclude this event from ads optimization (only attribution). */
  opt_out?: boolean;

  /** Unique ID for deduplication across Pixel and CAPI. */
  event_id?: string;

  /** Source of the event (e.g., website, app). */
  action_source: ActionSource;

  /** Processing options (e.g., ['LDU'] for CCPA limited data use). */
  data_processing_options?: DataProcessingOption[];

  /** Country code for data processing option (1 = USA, 0 = auto‑geolocate). */
  data_processing_options_country?: number;

  /** State code for data processing option (1000 = California, 0 = auto). */
  data_processing_options_state?: number;

  /** App‑specific data (required if action_source is 'app'). */
  app_data?: AppData;

  /** HTTP referrer header of the event. */
  referrer_url?: string;

  /** Metadata to link delayed events to past acquisition events. */
  original_event_data?: OriginalEventDataParameters;

  /** User segment for more context about the customer's relationship. */
  customer_segmentation?: CustomerSegmentation;
}

export type EventName =
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

export type ActionSource =
  | 'email'
  | 'website'
  | 'app'
  | 'phone_call'
  | 'chat'
  | 'physical_store'
  | 'system_generated'
  | 'business_messaging'
  | 'other';

export type DataProcessingOption = 'LDU';

export type CustomerSegmentation =
  | 'new_customer_to_business'
  | 'new_customer_to_business_line'
  | 'new_customer_to_product_area'
  | 'new_customer_to_medium'
  | 'existing_customer_to_business'
  | 'existing_customer_to_business_line'
  | 'existing_customer_to_product_area'
  | 'existing_customer_to_medium'
  | 'customer_in_loyalty_program';

/** Extended device info for app events (Android version 'a2', iOS 'i2') */
export interface AppData {
  /**
   * Comma-separated array of strings with fixed order:
   * [sdk_version, os_version, device_model, device_brand,
   *  screen_width, screen_height, ...]
   */
  extinfo: string[];
}

// Customer Information Parameters
// https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
export interface CustomerInformationParameters {
  /** Email(s), SHA-256 hashed, lowercase and trimmed */
  em?: string | string[];

  /** Phone number(s), SHA-256 hashed, E.164 format (no leading 0s or symbols) */
  ph?: string | string[];

  /** First name(s), SHA-256 hashed, lowercase */
  fn?: string | string[];

  /** Last name(s), SHA-256 hashed, lowercase */
  ln?: string | string[];

  /** Date(s) of birth in YYYYMMDD, SHA-256 hashed */
  db?: string | string[];

  /** Gender(s) in lowercase single letter ("m", "f", etc.), SHA-256 hashed */
  ge?: string | string[];

  /** City name(s), SHA-256 hashed, lowercase */
  ct?: string | string[];

  /** State abbreviation(s), SHA-256 hashed, lowercase (e.g., "ca", "ny") */
  st?: string | string[];

  /** ZIP or postal code(s), SHA-256 hashed, lowercase */
  zp?: string | string[];

  /** Country code(s), SHA-256 hashed, lowercase (ISO 3166-1 alpha-2) */
  country?: string | string[];

  /** External IDs, unique per user. SHA-256 recommended */
  external_id?: string | string[];

  /** IPv4 or IPv6 address of client. Do NOT hash. */
  client_ip_address?: string;

  /** User agent string from browser. Do NOT hash. */
  client_user_agent?: string;

  /** Facebook click ID (_fbc cookie). Do NOT hash. */
  fbc?: string;

  /** Facebook browser ID (_fbp cookie). Do NOT hash. */
  fbp?: string;

  /** Subscription ID for the transaction. Do NOT hash. */
  subscription_id?: string;

  /** Facebook login ID (App-Scoped ID). Do NOT hash. */
  fb_login_id?: number;

  /** Meta Lead Ad lead ID. Do NOT hash. */
  lead_id?: number;

  /** Anonymous install ID. App events only. Do NOT hash. */
  anon_id?: string;

  /** Mobile advertiser ID (GAID/IDFA). Do NOT hash. */
  madid?: string;

  /** Facebook Page ID. Do NOT hash. */
  page_id?: string;

  /** Messenger Page-scoped user ID. Do NOT hash. */
  page_scoped_user_id?: string;

  /** Click to WhatsApp ad click ID. Do NOT hash. */
  ctwa_clid?: string;

  /** Instagram business account ID. Do NOT hash. */
  ig_account_id?: string;

  /** Instagram-scoped user ID. Do NOT hash. */
  ig_sid?: string;
}

// https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/custom-data
export interface StandardParameters {
  // Web and Offline parameters
  availability?: string;
  body_style?: string;
  checkin_date?: string;
  city?: string;
  condition_of_vehicle?: string;
  content_ids?: string[];
  content_type?: 'product' | 'product_group' | string;
  contents?: Array<{
    id: string;
    quantity?: number;
    item_price?: number;
    delivery_category?: string;
  }>;
  country?: string;
  currency?: string;
  delivery_category?: 'in_store' | 'curbside' | 'home_delivery' | string;
  departing_arrival_date?: string;
  departing_departure_date?: string;
  destination_airport?: string;
  destination_ids?: string[];
  dma_code?: string;
  drivetrain?: string;
  exterior_color?: string;
  fuel_type?: string;
  hotel_score?: number;
  interior_color?: string;
  lead_event_source?: string;
  lease_end_date?: string;
  lease_start_date?: string;
  listing_type?: string;
  make?: string;
  // @TODO is mileage an object?
  'mileage.unit'?: string;
  'mileage.value'?: number;
  model?: string;
  neighborhood?: string;
  net_revenue?: number;
  num_adults?: number;
  num_children?: number;
  num_infants?: number;
  num_items?: number;
  order_id?: string;
  origin_airport?: string;
  postal_code?: string;
  predicted_ltv?: number;
  preferred_baths_range?: string;
  preferred_beds_range?: string;
  preferred_neighborhoods?: string[];
  preferred_num_stops?: number;
  preferred_price_range?: string;
  preferred_star_ratings?: [number, number];
  price?: string;
  product_catalog_id?: string;
  property_type?: string;
  region?: string;
  returning_arrival_date?: string;
  returning_departure_date?: string;
  search_string?: string;
  state_of_vehicle?: string;
  suggested_destinations?: string[];
  suggested_home_listings?: string[];
  suggested_hotels?: string[];
  suggested_jobs?: string[];
  suggested_local_service_businesses?: string[];
  suggested_location_based_items?: string[];
  suggested_vehicles?: string[];
  transmission?: string;
  travel_class?: string;
  travel_end?: string;
  travel_start?: string;
  trim?: string;

  // App-specific parameters (with fb_ prefix)
  fb_availability?: string;
  fb_body_style?: string;
  fb_checkin_date?: string;
  fb_city?: string;
  fb_condition_of_vehicle?: string;
  fb_content_ids?: string[];
  fb_content_type?: string;
  fb_contents?: Array<{ id: string; quantity?: number; item_price?: number }>;
  fb_country?: string;
  fb_currency?: string;
  fb_delivery_category?: string;
  fb_departing_arrival_date?: string;
  fb_departing_departure_date?: string;
  fb_destination_airport?: string;
  fb_destination_ids?: string[];
  fb_dma_code?: string;
  fb_drivetrain?: string;
  fb_exterior_color?: string;
  fb_fuel_type?: string;
  fb_hotel_score?: number;
  fb_interior_color?: string;
  fb_lease_end_date?: string;
  fb_lease_start_date?: string;
  fb_listing_type?: string;
  fb_make?: string;
  // @TODO is fb_mileage an object?
  'fb_mileage.unit'?: string;
  'fb_mileage.value'?: number;
  fb_model?: string;
  fb_neighborhood?: string;
  fb_num_adults?: number;
  fb_num_children?: number;
  fb_num_infants?: number;
  fb_num_items?: number;
  fb_order_id?: string;
  fb_origin_airport?: string;
  fb_postal_code?: string;
  fb_predicted_ltv?: number;
  fb_preferred_baths_range?: string;
  fb_preferred_beds_range?: string;
  fb_preferred_neighborhoods?: string[];
  fb_preferred_num_stops?: number;
  fb_preferred_price_range?: string;
  fb_preferred_star_ratings?: [number, number];
  fb_price?: string;
  fb_product_catalog_id?: string;
  fb_property_type?: string;
  fb_region?: string;
  fb_returning_arrival_date?: string;
  fb_returning_departure_date?: string;
  fb_search_string?: string;
  fb_state_of_vehicle?: string;
  fb_suggested_destinations?: string[];
  fb_suggested_home_listings?: string[];
  fb_suggested_hotels?: string[];
  fb_suggested_jobs?: string[];
  fb_suggested_local_service_businesses?: string[];
  fb_suggested_location_based_items?: string[];
  fb_suggested_vehicles?: string[];
  fb_transmission?: string;
  fb_travel_class?: string;
  fb_travel_end?: string;
  fb_travel_start?: string;

  // Offline-specific parameters
  user_bucket?: string;
  value?: number;
  vin?: string;
  year?: number;
  item_number?: string;
}

export interface OriginalEventDataParameters {
  event_name?: EventName;
  event_time?: number;
  order_id?: number;
  event_id?: string;
}
