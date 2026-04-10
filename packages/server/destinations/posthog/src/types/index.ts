import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer } from '@walkeros/server-core';
import type { PostHog } from 'posthog-node';

export interface Settings {
  /** PostHog project API key (phc_...) */
  apiKey: string;
  /** PostHog client instance, populated by init */
  client?: PostHog;
  /** Destination-level identity mapping */
  identify?: WalkerOSMapping.Value;
  /** Destination-level group mapping */
  group?: WalkerOSMapping.Value;
  /** Event sections to flatten into capture properties */
  include?: string[];
  // PostHog SDK passthrough options
  host?: string;
  flushAt?: number;
  flushInterval?: number;
  personalApiKey?: string;
  featureFlagsPollingInterval?: number;
  disableGeoip?: boolean;
  disableCompression?: boolean;
  requestTimeout?: number;
  fetchRetryCount?: number;
  fetchRetryDelay?: number;
  debug?: boolean;
  disabled?: boolean;
}

export type InitSettings = Partial<Settings>;

export interface Mapping {
  identify?: WalkerOSMapping.Value;
  group?: WalkerOSMapping.Value;
}

export interface Env extends DestinationServer.Env {
  PostHog?: typeof PostHog;
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
