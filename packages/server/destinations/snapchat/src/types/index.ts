import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';

export interface Settings {
  accessToken: string;
  pixelId: string;
  url?: string;
  action_source?: ActionSource;
  doNotHash?: string[];
  user_data?: WalkerOSMapping.Map;
  testMode?: boolean;
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

/**
 * Snapchat Conversions API v3
 * https://businesshelp.snapchat.com/s/article/conversions-api
 */
export type ActionSource = 'WEB' | 'MOBILE_APP' | 'OFFLINE';

export interface RequestBody {
  data: SnapchatEvent[];
}

export interface SnapchatEvent {
  event_name: string;
  event_time: number;
  action_source: ActionSource;
  event_source_url?: string;
  event_id?: string;
  user_data: UserData;
  custom_data?: CustomData;
}

// User identity fields. Hashable: em, ph, fn, ln, db, ge, ct, st, zp, country,
// external_id. Non-hashable: sc_cookie1, client_ip_address, client_user_agent,
// sc_click_id, idfv, madid.
export interface UserData {
  /** Email, SHA-256 hashed, lowercase trimmed */
  em?: string;
  /** Phone number, SHA-256 hashed, E.164 digits */
  ph?: string;
  /** First name, SHA-256 hashed, lowercase */
  fn?: string;
  /** Last name, SHA-256 hashed, lowercase */
  ln?: string;
  /** Date of birth YYYYMMDD, SHA-256 hashed */
  db?: string;
  /** Gender (m/f), SHA-256 hashed */
  ge?: string;
  /** City, SHA-256 hashed, lowercase */
  ct?: string;
  /** State, SHA-256 hashed, lowercase */
  st?: string;
  /** Zip/postal code, SHA-256 hashed */
  zp?: string;
  /** Country code ISO 3166-1 alpha-2, SHA-256 hashed */
  country?: string;
  /** External/customer ID, SHA-256 hash recommended */
  external_id?: string;
  /** Snap cookie. Do NOT hash. */
  sc_cookie1?: string;
  /** Client IP address (IPv4 or IPv6). Do NOT hash. */
  client_ip_address?: string;
  /** Client user agent. Do NOT hash. */
  client_user_agent?: string;
  /** Snap click ID. Do NOT hash. */
  sc_click_id?: string;
  /** iOS IDFV. Do NOT hash. */
  idfv?: string;
  /** Mobile advertiser ID (IDFA/AAID). Do NOT hash. */
  madid?: string;
}

export interface CustomData {
  value?: number;
  currency?: string;
  contents?: ContentItem[];
  item_ids?: string[];
  number_items?: number;
  price?: number;
  cart_total?: number;
  search_string?: string;
  item_category?: string;
  brands?: string[];
  description?: string;
  transaction_id?: string;
  payment_info_available?: number;
  delivery_category?: string;
  sign_up_method?: string;
  level?: string;
  [key: string]: unknown;
}

export interface ContentItem {
  id?: string;
  quantity?: number;
  item_price?: number;
  brand?: string;
}

export interface ResponseBody {
  status: string;
  request_id?: string;
}

/**
 * Standard Snapchat event names (UPPERCASE).
 * Custom events via CUSTOM_EVENT_1..5 or arbitrary strings.
 */
export type StandardEventName =
  | 'PAGE_VIEW'
  | 'VIEW_CONTENT'
  | 'ADD_CART'
  | 'ADD_TO_WISHLIST'
  | 'START_CHECKOUT'
  | 'ADD_BILLING'
  | 'PURCHASE'
  | 'SIGN_UP'
  | 'SEARCH'
  | 'SAVE'
  | 'SUBSCRIBE'
  | 'COMPLETE_TUTORIAL'
  | 'START_TRIAL'
  | 'AD_CLICK'
  | 'AD_VIEW'
  | 'APP_OPEN'
  | 'LEVEL_COMPLETE'
  | 'INVITE'
  | 'LOGIN'
  | 'SHARE'
  | 'RESERVE'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'SPENT_CREDITS'
  | 'RATE'
  | 'LIST_VIEW'
  | 'CUSTOM_EVENT_1'
  | 'CUSTOM_EVENT_2'
  | 'CUSTOM_EVENT_3'
  | 'CUSTOM_EVENT_4'
  | 'CUSTOM_EVENT_5'
  | (string & {});
