import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';

export interface Settings {
  pixelCode: string;
  accessToken: string;
  url?: string;
  test_event_code?: string;
  doNotHash?: string[];
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

// TikTok Events API Request Body
export interface RequestBody {
  pixel_code: string;
  partner_name?: string;
  test_event_code?: string;
  data: EventData[];
}

// Individual event in the data array
export interface EventData {
  event: string;
  event_id: string;
  timestamp: string;
  context?: EventContext;
  properties?: Record<string, unknown>;
}

// Context object within each event
export interface EventContext {
  ip?: string;
  user_agent?: string;
  user?: UserData;
  page?: PageContext;
  ad?: AdContext;
}

// User identity fields
export interface UserData {
  email?: string;
  phone_number?: string;
  external_id?: string;
  ttp?: string;
  ttclid?: string;
  locale?: string;
}

// Page context
export interface PageContext {
  url?: string;
  referrer?: string;
}

// Ad attribution context
export interface AdContext {
  callback?: string;
}

// TikTok API response
export interface ResponseBody {
  code: number;
  message: string;
  data?: Record<string, unknown>;
}

// Standard TikTok event names
export type StandardEventName =
  | 'ViewContent'
  | 'ClickButton'
  | 'Search'
  | 'AddToWishlist'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'CompletePayment'
  | 'PlaceAnOrder'
  | 'Contact'
  | 'Download'
  | 'SubmitForm'
  | 'CompleteRegistration'
  | 'Subscribe'
  | (string & {});
