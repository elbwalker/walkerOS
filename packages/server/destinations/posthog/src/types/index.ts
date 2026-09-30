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
  client?: PostHogClient;
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

/**
 * The part of a PostHog client this destination calls. `PostHog` from
 * `posthog-node` satisfies it, and so does an injected mock (tests, simulate)
 * without a cast.
 */
export interface PostHogClient {
  capture(props: Parameters<PostHog['capture']>[0]): void;
  identify(props: Parameters<PostHog['identify']>[0]): void;
  groupIdentify(props: Parameters<PostHog['groupIdentify']>[0]): void;
  shutdown(): Promise<void> | void;
  enable(): Promise<void> | void;
  disable(): Promise<void> | void;
}

export interface Env extends DestinationServer.Env {
  PostHog?: new (
    apiKey: string,
    options?: ConstructorParameters<typeof PostHog>[1],
  ) => PostHogClient;
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
