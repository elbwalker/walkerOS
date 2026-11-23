import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
  HashSettings,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';
import type { HashKey } from '../hash';

export interface Settings extends HashSettings<HashKey> {
  pixelCode: string;
  accessToken: string;
  url?: string;
  test_event_code?: string;
  user_data?: WalkerOSMapping.Map;
  partner_name?: string;
  /**
   * Client IP, sent as user.ip. Resolves against { ingest, event }.
   * `false` switches it off.
   * @default ['ingest.ip', 'event.user.ip']
   */
  ip?: WalkerOSMapping.Value | false;
  /**
   * Client user agent, sent as user.user_agent. Resolves against
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

// TikTok Events API 2.0 request body (POST /open_api/v1.3/event/track/)
export interface RequestBody {
  event_source: 'web';
  event_source_id: string;
  partner_name?: string;
  test_event_code?: string;
  data: EventData[];
}

// Individual event in the data array
export interface EventData {
  event: string;
  event_id: string;
  /** Unix time in seconds */
  event_time: number;
  user?: UserData;
  page?: PageContext;
  properties?: Record<string, unknown>;
}

// User identity and client fields
export interface UserData {
  /** A list is hashed item by item and sent as a list */
  email?: string | string[];
  /** Sent as `phone`; `phone_number` is accepted as a mapping key */
  phone?: string | string[];
  phone_number?: string | string[];
  external_id?: string | string[];
  ttp?: string;
  ttclid?: string;
  locale?: string;
  ip?: string;
  user_agent?: string;
}

// Page context
export interface PageContext {
  url?: string;
  referrer?: string;
}

// TikTok API response
export interface ResponseBody {
  code: number;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Some of TikTok's standard event names, for IDE autocomplete on
 * `mapping.name`. TikTok's own list is the complete one:
 * https://ads.tiktok.com/help/article/standard-events-parameters
 * `| string` allows any other name.
 */
export type StandardEventName =
  | 'ViewContent'
  | 'Search'
  | 'AddToWishlist'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Purchase'
  | 'Contact'
  | 'Download'
  | 'SubmitForm'
  | 'CompleteRegistration'
  | 'Subscribe'
  | (string & {});
