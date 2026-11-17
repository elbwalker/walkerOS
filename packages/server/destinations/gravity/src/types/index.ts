import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';

export interface Settings {
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

/** Where the conversion happened, like `website` (the default) */
export type ActionSource = string;

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

export type UserData = {
  em?: string[];
  ph?: string[];
  external_id?: string[];
  client_ip_address?: string;
  client_user_agent?: string;
} & Partial<Record<ClickKey, string>>;

export interface CustomData {
  value?: number;
  currency?: string;
  order_id?: string;
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

export interface ResponseBody {
  results?: { status?: string; error?: string }[];
}
