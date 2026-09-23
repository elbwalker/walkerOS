import type {
  Destination as CoreDestination,
  Mapping as WalkerOSMapping,
  WalkerOS,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';

/** A named auto-fill input: a Mapping Value resolved against { event, ingest }, or false to switch it off. */
export type Input = WalkerOSMapping.Value | false;

/** Bare dimension id -> Mapping Value, e.g. { "1": "data.size" }. */
export type CustomDimensions = Record<string, WalkerOSMapping.Value>;

export interface Settings {
  url: string;
  appId: string;
  timeout?: number;
  identified?: boolean | WalkerOS.Consent;
  customDimensions?: CustomDimensions;
  ip?: Input;
  userAgent?: Input;
  language?: Input;
  pageUrl?: Input;
  referrer?: Input;
  visitorId?: Input;
  userId?: Input;
  pageViewId?: Input;
  timestamp?: Input;
}

export type InitSettings = Partial<Settings>;

export interface Mapping {
  goalId?: string | number;
  goalValue?: WalkerOSMapping.Value;
  customDimensions?: CustomDimensions;
}

export interface Env extends DestinationServer.Env {
  sendServer?: typeof sendServer;
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export interface Destination extends DestinationServer.Destination<Types> {
  init: DestinationServer.InitFn<Types>;
}

export type Config = { settings: Settings } & DestinationServer.Config<Types>;
export type PartialConfig = DestinationServer.PartialConfig<Types>;
export type PushFn = DestinationServer.PushFn<Types>;
export type PushBatchFn = CoreDestination.PushBatchFn<Types>;
export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;

/** One Tracking API request as ordered [parameter, value] pairs. */
export type Hit = Array<[string, string]>;
