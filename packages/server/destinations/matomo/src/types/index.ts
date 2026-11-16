import type {
  Destination as CoreDestination,
  Mapping as WalkerOSMapping,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';

/** A mapping value resolved against `{ ingest, event }`, or `false` to switch it off. */
export type Input = WalkerOSMapping.Value | false;

/** A string is the value itself; a value config resolves per event against `{ ingest, event }`. */
export type Target = string | WalkerOSMapping.ValueConfig;

/** Bare dimension id to a mapping value resolved against the event, like { "1": "data.size" }. */
export type CustomDimensions = Record<string, WalkerOSMapping.Value>;

/**
 * The Matomo auth token of a user with write access to the site, sent in the
 * bulk body as token_auth; set it with `$secret.`.
 */
export type Credentials = { token: string };

export interface Settings {
  url: Target;
  siteId: Target | number;
  ip?: Input;
  userAgent?: Input;
  language?: Input;
  pageUrl?: Input;
  referrer?: Input;
  visitorId?: Input;
  userId?: Input;
  screenSize?: Input;
  pageViewId?: Input;
  timestamp?: Input;
  customDimensions?: CustomDimensions;
}

export type InitSettings = Partial<Settings>;

export interface Mapping {
  goalId?: string | number;
  goalValue?: WalkerOSMapping.Value;
  customDimensions?: CustomDimensions;
  items?: WalkerOSMapping.Value;
  ecommerceView?: WalkerOSMapping.Value;
}

export interface Env extends DestinationServer.Env {
  sendServer?: typeof sendServer;
}

export type Types = CoreDestination.Types<
  Settings,
  Mapping,
  Env,
  InitSettings,
  unknown,
  Credentials
>;

export interface Destination extends DestinationServer.Destination<Types> {
  init: DestinationServer.InitFn<Types>;
}

export type Config = { settings: Settings } & DestinationServer.Config<Types>;
export type PartialConfig = DestinationServer.PartialConfig<Types>;
export type PushFn = DestinationServer.PushFn<Types>;
export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;

/** One Tracking API request as ordered [parameter, value] pairs. */
export type Hit = Array<[string, string]>;
