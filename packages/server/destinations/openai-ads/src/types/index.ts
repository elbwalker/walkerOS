import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';

export interface Settings {
  /** Conversions API key (Ads Manager > Conversions), sent as Bearer token */
  apiKey: string;
  /** Pixel ID of the web data source, sent as the `pid` query parameter */
  pixelId: string;
  /** Where the conversion happened. @default 'web' */
  action_source?: ActionSource;
  /** `true`: OpenAI validates the request and records nothing */
  validate_only?: boolean;
  /** Free label for the sending integration */
  integration_source?: string;
  /** Endpoint without query string. @default 'https://bzr.openai.com/v1/events' */
  url?: string;
  /**
   * Client IP, sent as user.ip_address. Resolves against { ingest, event }.
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

// OpenAI Ads Conversions API types
// https://developers.openai.com/ads/conversions-api

export type ActionSource =
  | 'web'
  | 'mobile_app'
  | 'offline'
  | 'physical_store'
  | 'phone_call'
  | 'email'
  | 'other';

export type StandardEventType =
  | 'appointment_scheduled'
  | 'checkout_started'
  | 'contents_viewed'
  | 'items_added'
  | 'lead_created'
  | 'order_created'
  | 'page_viewed'
  | 'registration_completed'
  | 'subscription_created'
  | 'trial_started';

export type EventType = StandardEventType | 'custom';

export type DataType =
  | 'customer_action'
  | 'contents'
  | 'plan_enrollment'
  | 'custom';

export interface UserData {
  emails_sha256?: string[];
  phone_numbers_sha256?: string[];
  external_ids_sha256?: string[];
  obref?: string;
  countries?: string[];
  user_agent?: string;
  ip_address?: string;
}

export interface EventData {
  type: DataType;
  /** Integer minor units (99.90 USD → 9990) */
  amount?: number;
  currency?: string;
  plan_id?: string;
}

export interface ConversionEvent {
  id: string;
  type: EventType;
  custom_event_name?: string;
  timestamp_ms: number;
  oppref?: string;
  source_url?: string;
  action_source: ActionSource;
  user?: UserData;
  data: EventData;
}

export interface RequestBody {
  validate_only?: boolean;
  integration_source?: string;
  events: ConversionEvent[];
}
