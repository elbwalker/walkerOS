import type {
  HashSettings,
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';
import type { HashKey } from '../hash';

export interface Settings extends HashSettings<HashKey> {
  /** Gravity API key (Settings > Organization), sent as Bearer token */
  apiKey: string;
  /** Where the conversion happened. @default 'website' */
  action_source?: ActionSource;
  /** Test event code from Events Manager: validated, not recorded */
  test_event_code?: string;
  /** Endpoint. @default 'https://api.trygravity.com/gateway/events' */
  url?: string;
  /**
   * Client IP, sent as user_data.client_ip_address. Resolves against
   * { ingest, event }. `false` switches it off.
   * @default ['ingest.ip', 'event.user.ip']
   */
  ip?: WalkerOSMapping.Value | false;
  /**
   * Client user agent, sent as user_data.client_user_agent. Resolves
   * against { ingest, event }. `false` switches it off.
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

// Gravity Conversions API types
// https://docs.trygravity.com/advertisers/server-conversions

/** Where the conversion happened, as Gravity lists it */
export const ACTION_SOURCES = [
  'website',
  'app',
  'email',
  'phone_call',
  'chat',
  'physical_store',
  'system_generated',
  'pixel',
  'other',
] as const;

export type ActionSource = (typeof ACTION_SOURCES)[number];

/** Gravity click parameters, stored on the landing page */
export const CLICK_KEYS = [
  'grclid',
  'grcpid',
  'grpuid',
  'gradid',
  'grsig',
  'graid',
  'oppref',
] as const;

export type ClickKey = (typeof CLICK_KEYS)[number];

/**
 * The user_data keys Gravity documents: the set the Gravity pixel's
 * getCAPIData() returns, and the identity keys from the backend.
 */
export const USER_DATA_KEYS = [
  ...CLICK_KEYS,
  'visitor_id',
  'session_id',
  'client_user_agent',
  'client_ip_address',
  'em',
  'ph',
  'fn',
  'ln',
  'external_id',
] as const;

export type UserDataKey = (typeof USER_DATA_KEYS)[number];

/**
 * user_data as sent: em, ph, fn and ln SHA-256 hashed, every other value as
 * mapped, so a passed pixel object reaches Gravity unchanged.
 */
export type UserData = Partial<Record<UserDataKey, unknown>>;

export interface CustomData {
  value?: number;
  currency?: string;
  order_id?: string;
  /** Line items, like `{ id, quantity, item_price, title }` */
  contents?: Record<string, unknown>[];
  content_name?: string;
  content_category?: string;
  predicted_ltv?: number;
}

export interface ConversionEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: ActionSource;
  event_source_url?: string;
  user_data: UserData;
  client_context?: Record<string, unknown>;
  custom_data?: CustomData;
}

export interface RequestBody {
  test_event_code?: string;
  data: ConversionEvent[];
}

/** Gravity's status for one event of a request */
export type ResultStatus =
  | 'accepted'
  | 'ok'
  | 'duplicate'
  | 'test_ok'
  | 'skipped'
  | 'error';

/** Gravity's HTTP 200 answer */
export interface ResponseBody {
  events_received?: number;
  events_processed?: number;
  events_errored?: number;
  results?: {
    event_id?: string;
    status?: ResultStatus;
    attributed?: boolean;
    error?: string;
  }[];
  test_mode?: boolean;
}
