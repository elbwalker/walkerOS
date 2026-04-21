import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';

export interface Settings {
  accessToken: string;
  pixelId: string;
  action_source?: ActionSource;
  doNotHash?: string[];
  test_mode?: boolean;
  url?: string;
  user_data?: WalkerOSMapping.Map;
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

export type ActionSource = 'WEBSITE' | 'APP' | 'PHYSICAL_STORE';

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
  // Hashable fields (SHA-256)
  email?: string;
  external_id?: string;
  ip_address?: string;
  user_agent?: string;
  idfa?: string;
  aaid?: string;

  // Pass-through fields (not hashed)
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
  event_metadata?: EventMetadata;
  user: UserData;
}

export interface RequestBody {
  test_mode?: boolean;
  data: {
    events: ConversionEvent[];
  };
}

export interface ResponseBody {
  success?: boolean;
  message?: string;
}
