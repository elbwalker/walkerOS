import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';

export type CallType = 'conversion' | 'payment';

export interface Settings {
  /** Reditus API token, sent as Bearer token */
  apiKey: string;
  /** Call made when the rule sets no type. @default 'conversion' */
  type?: CallType;
  /** API base URL. @default 'https://api.getreditus.com/api' */
  url?: string;
}

export type InitSettings = Partial<Settings>;

export interface Mapping {
  /** Reditus call for this rule: a referral conversion or a payment */
  type?: CallType;
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

// Reditus API types
// https://docs.getreditus.com

/** POST /v2/tracking/conversion: a referred visitor signed up */
export interface ConversionBody {
  affiliate_slug?: string;
  advocate_slug?: string;
  email?: string;
  uid?: string;
  gr_id?: string;
}

/** POST /v1/payments: a referred customer paid */
export interface PaymentBody {
  /** The payment processor's payment id; a refund quotes it later */
  idempotency_key: string;
  /** Integer in minor units (cents) */
  amount: number;
  currency: string;
  referral_uid?: string;
  referral_email?: string;
  subscription_id?: string;
  interval?: 'month' | 'year';
  interval_count?: number;
}
