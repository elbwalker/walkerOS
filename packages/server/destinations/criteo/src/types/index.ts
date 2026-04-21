import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';

export interface Settings {
  /** Criteo Partner ID (numeric string, provided by Criteo) */
  partnerId: string;
  /** Caller ID for user mapping (provided by Criteo) */
  callerId: string;
  /** Site type: `d` (desktop), `m` (mobile web), `t` (tablet). Default `d`. */
  siteType?: SiteType;
  /** ISO 3166-1 alpha-2 country code */
  country?: string;
  /** 2-letter language code */
  language?: string;
  /** API endpoint override (default: https://widget.criteo.com/m/event?version=s2s_v0) */
  url?: string;
  /** Mapping for identity fields (mapped_user_id, email, retailer_visitor_id) */
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

/** Site type: desktop / mobile web / tablet */
export type SiteType = 'd' | 'm' | 't';

/**
 * Criteo Events API (S2S v0)
 * https://guides.criteotilt.com/events-api/
 */
export interface CriteoRequestBody {
  /** Integration version identifier (e.g. `walkeros_criteo_1.0.0`) */
  version: string;
  site_type?: SiteType;
  /** Criteo Partner ID */
  account: string;
  id: CriteoIdentity;
  ip?: string;
  full_url?: string;
  previous_url?: string;
  useragent?: string;
  retailer_visitor_id?: string;
  country?: string;
  language?: string;
  events: CriteoEvent[];
}

export interface CriteoIdentity {
  /** GUM ID */
  mapped_user_id?: string;
  /** Caller ID (provided by Criteo) */
  mapping_key: string;
  email?: CriteoEmailHashes;
}

export interface CriteoEmailHashes {
  raw?: string;
  md5?: string;
  sha256?: string;
  sha256_md5?: string;
}

export interface CriteoEvent {
  event: CriteoEventName;
  /** ISO 8601 timestamp */
  timestamp?: string;
  /** Transaction ID or event-level ID */
  id?: string;
  item?: CriteoItem[];
  deduplication_page_view_id?: string;
}

export interface CriteoItem {
  id: string;
  price?: number;
  quantity?: number;
}

/**
 * Standard Criteo Events API event names.
 * Custom event names are also accepted as plain strings.
 */
export type CriteoEventName =
  | 'viewHome'
  | 'viewPage'
  | 'viewItem'
  | 'viewList'
  | 'addToCart'
  | 'viewBasket'
  | 'beginCheckout'
  | 'trackTransaction'
  | 'addPaymentInfo'
  | 'login'
  | (string & {});
