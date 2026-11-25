import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
  HashSettings,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';
import type { HashKey } from '../hash';

export interface Settings extends HashSettings<HashKey> {
  accessToken: string;
  pixelId: string;
  /** Sent as events[].action_source; Reddit takes WEBSITE when it is unset */
  action_source?: ActionSource;
  test_mode?: boolean;
  url?: string;
  user_data?: WalkerOSMapping.Map;
  /**
   * Client IP, sent as user.ip_address (hashed). Resolves against { ingest, event }.
   * `false` switches it off.
   * @default ['ingest.ip', 'event.user.ip']
   */
  ip?: WalkerOSMapping.Value | false;
  /**
   * Client user agent, sent as user.user_agent (as is, never hashed). Resolves against
   * { ingest, event }. `false` switches it off.
   * @default ['ingest.userAgent', 'event.user.userAgent']
   */
  userAgent?: WalkerOSMapping.Value | false;
}

export type InitSettings = Partial<Settings>;

export interface Mapping {}

export interface Env extends DestinationServer.Env {
  sendServer?: typeof sendServer;
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export interface Destination extends DestinationServer.Destination<Types> {
  init: DestinationServer.InitFn<Types>;
}

export type Config = {
  settings: Settings;
} & DestinationServer.Config<Types>;

export type InitFn = DestinationServer.InitFn<Types>;
export type PushFn = DestinationServer.PushFn<Types>;

export type PartialConfig = DestinationServer.PartialConfig<Types>;

export type PushEvents = DestinationServer.PushEvents<Mapping>;

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;

// Reddit Conversions API types
// https://ads-api.reddit.com/docs/v2/#tag/Conversions-API

export type ActionSource = 'WEBSITE' | 'APP' | 'PHYSICAL_STORE' | 'OTHER';

export type TrackingType =
  | 'PageVisit'
  | 'ViewContent'
  | 'Search'
  | 'AddToCart'
  | 'AddToWishlist'
  | 'Purchase'
  | 'Lead'
  | 'SignUp'
  | 'Custom';

export interface EventType {
  tracking_type: TrackingType;
  custom_event_name?: string;
}

export interface Product {
  id: string;
  name?: string;
  category: string;
}

export interface EventMetadata {
  conversion_id?: string;
  item_count?: number;
  currency?: string;
  value?: number;
  value_decimal?: number;
  products?: Product[];
  units_sold?: number;
  country_code?: string;
}

export interface ScreenDimensions {
  width: number;
  height: number;
}

export interface DataProcessingOptions {
  modes: string[];
  country?: string;
  region?: string;
}

export interface UserData {
  // Hashed (SHA-256) after Reddit's canonicalization; one value each
  email?: string;
  external_id?: string;
  ip_address?: string;
  phone_number?: string;
  idfa?: string;
  aaid?: string;

  // Pass-through fields (not hashed)
  user_agent?: string;
  uuid?: string;
  opt_out?: boolean;
  screen_dimensions?: ScreenDimensions;
  data_processing_options?: DataProcessingOptions;
}

export interface ConversionEvent {
  click_id?: string;
  event_at: string;
  event_at_ms?: number;
  event_type: EventType;
  action_source?: ActionSource;
  event_metadata?: EventMetadata;
  user: UserData;
}

// v2.0 body: `events` at the top level (the `data` envelope belongs to v3).
export interface RequestBody {
  test_mode?: boolean;
  events: ConversionEvent[];
}

// v2.0 answers 200 with { message }, such as
// "Successfully processed 1 conversion events."
export interface ResponseBody {
  message: string;
}
