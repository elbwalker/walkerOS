import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';

export interface Settings {
  accessToken: string;
  adAccountId: string;
  action_source?: ActionSource;
  doNotHash?: string[];
  test?: boolean;
  url?: string;
  user_data?: WalkerOSMapping.Map;
  partner_name?: string;
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

// Pinterest Conversions API types
// https://developers.pinterest.com/docs/conversions/conversions/

export type ActionSource = 'app_android' | 'app_ios' | 'web' | 'offline';

export type EventName =
  | 'add_payment_info'
  | 'add_to_cart'
  | 'add_to_wishlist'
  | 'app_install'
  | 'app_open'
  | 'checkout'
  | 'contact'
  | 'custom'
  | 'customize_product'
  | 'find_location'
  | 'initiate_checkout'
  | 'lead'
  | 'page_visit'
  | 'schedule'
  | 'search'
  | 'signup'
  | 'start_trial'
  | 'submit_application'
  | 'subscribe'
  | 'view_category'
  | 'view_content'
  | 'watch_video'
  | string;

export interface ConversionEvent {
  // Required
  event_name: EventName;
  event_time: number;
  event_id: string;
  action_source: ActionSource;
  user_data: UserData;

  // Optional
  event_source_url?: string;
  opt_out?: boolean;
  partner_name?: string;
  app_id?: string;
  app_name?: string;
  app_version?: string;
  device_brand?: string;
  device_carrier?: string;
  device_model?: string;
  device_type?: string;
  os_version?: string;
  language?: string;
  wifi?: boolean;
  custom_data?: CustomData;
}

export interface UserData {
  // Hashable fields (SHA-256, arrays)
  em?: string[];
  ph?: string[];
  fn?: string[];
  ln?: string[];
  db?: string[];
  ge?: string[];
  ct?: string[];
  st?: string[];
  zp?: string[];
  country?: string[];
  external_id?: string[];
  hashed_maids?: string[];

  // Pass-through fields (do NOT hash)
  client_ip_address?: string;
  client_user_agent?: string;
  click_id?: string;
  partner_id?: string;
}

export interface CustomData {
  currency?: string;
  value?: string;
  content_ids?: string[];
  content_name?: string;
  content_category?: string;
  content_brand?: string;
  contents?: ContentItem[];
  num_items?: number;
  order_id?: string;
  search_string?: string;
  opt_out_type?: string;
  np?: string;
  predicted_ltv?: string;
}

export interface ContentItem {
  id?: string;
  item_name?: string;
  item_category?: string;
  item_brand?: string;
  item_price?: string;
  quantity?: number;
}

export interface RequestBody {
  data: ConversionEvent[];
}

export interface ResponseBody {
  num_events_received: number;
  num_events_processed: number;
  events: Array<{
    status: string;
    error_message?: string;
    warning_message?: string;
  }>;
}
