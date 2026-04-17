import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';

export interface Settings {
  accessToken: string;
  tagId: string;
  url?: string;
  doNotHash?: string[];
  user_data?: WalkerOSMapping.Map;
  dataProvider?: string;
  continueOnValidationError?: boolean;
}

export type InitSettings = Partial<Settings>;

export interface Mapping {
  eventType?: EventType;
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

/**
 * Microsoft Advertising (Bing) UET Conversions API
 * https://learn.microsoft.com/en-us/advertising/guides/universal-event-tracking-capi
 */
export type EventType = 'pageLoad' | 'custom';

export type AdStorageConsent = 'G' | 'D';

export interface CAPIRequestBody {
  data: CAPIEvent[];
  dataProvider?: string;
  continueOnValidationError?: boolean;
}

export interface CAPIEvent {
  eventType: EventType;
  eventId?: string;
  eventName?: string;
  eventTime: number;
  eventSourceUrl?: string;
  pageLoadId?: string;
  referrerUrl?: string;
  pageTitle?: string;
  keywords?: string;
  adStorageConsent?: AdStorageConsent;
  userData?: UserData;
  customData?: CustomData;
}

// User identity fields. Hashable: em, ph. Non-hashable: anonymousId,
// externalId, msclkid, clientIpAddress, clientUserAgent, idfa, gaid.
export interface UserData {
  /** Anonymous ID. Do NOT hash. */
  anonymousId?: string;
  /** External/customer ID. Do NOT hash. */
  externalId?: string;
  /** Email, SHA-256 hashed, normalized (dots/alias stripped, lowercased) */
  em?: string;
  /** Phone number, SHA-256 hashed, trimmed */
  ph?: string;
  /** Microsoft click ID. Do NOT hash. */
  msclkid?: string;
  /** Client IP address (IPv4 or IPv6). Do NOT hash. */
  clientIpAddress?: string;
  /** Client user agent. Do NOT hash. */
  clientUserAgent?: string;
  /** iOS IDFA. Do NOT hash. */
  idfa?: string;
  /** Android advertising ID (GAID). Do NOT hash. */
  gaid?: string;
}

export interface CustomData {
  eventCategory?: string;
  eventLabel?: string;
  eventValue?: number;
  searchTerm?: string;
  transactionId?: string;
  value?: number;
  currency?: string;
  items?: ItemData[];
  itemIds?: string[];
  pageType?: string;
  ecommTotalValue?: number;
  ecommCategory?: string;
  hotelData?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ItemData {
  id?: string;
  quantity?: number;
  price?: number;
  name?: string;
}

export interface ResponseBody {
  status?: string;
  requestId?: string;
}
