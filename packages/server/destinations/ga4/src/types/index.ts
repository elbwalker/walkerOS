import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';

export interface Settings {
  /** GA4 measurement id of the web data stream (G-...) */
  measurementId: string;
  /** Measurement Protocol API secret of that stream */
  apiSecret: string;
  /**
   * Endpoint without query string.
   * @default 'https://www.google-analytics.com/mp/collect'
   */
  url?: string;
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

// GA4 Measurement Protocol types
// https://developers.google.com/analytics/devguides/collection/protocol/ga4

export type ConsentValue = 'GRANTED' | 'DENIED';

export interface MeasurementEvent {
  name: string;
  params: Record<string, unknown>;
}

export interface RequestBody {
  client_id: string;
  user_id?: string;
  timestamp_micros?: number;
  consent: {
    ad_user_data: ConsentValue;
    ad_personalization: ConsentValue;
  };
  events: MeasurementEvent[];
}
