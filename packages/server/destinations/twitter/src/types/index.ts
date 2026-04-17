import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';

export interface Settings {
  pixelId: string;
  eventId: string;
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  apiVersion?: string;
  doNotHash?: string[];
  url?: string;
  user_data?: WalkerOSMapping.Map;
}

export type InitSettings = Partial<Settings>;

export interface Mapping {
  eventId?: WalkerOSMapping.Value;
  value?: WalkerOSMapping.Value;
  currency?: WalkerOSMapping.Value;
  number_items?: WalkerOSMapping.Value;
  description?: WalkerOSMapping.Value;
}

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

// X (Twitter) Conversions API types

/**
 * User identifier -- each is a single-key object.
 * X requires at least one primary identifier (twclid, hashed_email, hashed_phone_number).
 * ip_address and user_agent are secondary identifiers.
 */
export type Identifier =
  | { twclid: string }
  | { hashed_email: string }
  | { hashed_phone_number: string }
  | { ip_address: string }
  | { user_agent: string };

/** Product/content detail within a conversion */
export interface Content {
  content_id?: string;
  content_name?: string;
  content_type?: string;
  content_price?: number;
  num_items?: number;
  content_group_id?: string;
}

/** A single conversion event in the payload */
export interface ConversionEvent {
  conversion_time: string;
  event_id: string;
  identifiers: Identifier[];
  conversion_id?: string;
  value?: string;
  number_items?: number;
  description?: string;
  contents?: Content[];
}

/** Top-level request body for X Conversions API */
export interface ConversionsRequest {
  conversions: ConversionEvent[];
}
