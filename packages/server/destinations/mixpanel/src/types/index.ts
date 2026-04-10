import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer } from '@walkeros/server-core';
import type Mixpanel from 'mixpanel';

// Re-export the SDK's callback type for convenience
export type MixpanelCallback = (err: Error | undefined) => void;

/**
 * Subset of the Mixpanel People API used by the destination.
 * Every method requires `distinct_id` as the first argument (stateless server SDK).
 */
export interface MixpanelPeople {
  set(
    distinctId: string,
    properties: Record<string, unknown>,
    callback?: MixpanelCallback,
  ): void;
  set_once(
    distinctId: string,
    properties: Record<string, unknown>,
    callback?: MixpanelCallback,
  ): void;
  increment(
    distinctId: string,
    properties: Record<string, number>,
    callback?: MixpanelCallback,
  ): void;
  append(
    distinctId: string,
    properties: Record<string, unknown>,
    callback?: MixpanelCallback,
  ): void;
  union(
    distinctId: string,
    data: Record<string, unknown>,
    callback?: MixpanelCallback,
  ): void;
  remove(
    distinctId: string,
    data: Record<string, unknown>,
    callback?: MixpanelCallback,
  ): void;
  unset(
    distinctId: string,
    propertyName: string | string[],
    callback?: MixpanelCallback,
  ): void;
  delete_user(distinctId: string, callback?: MixpanelCallback): void;
}

/**
 * Subset of the Mixpanel Groups API used by the destination.
 * Every method requires `(groupKey, groupId)` as the first two args.
 */
export interface MixpanelGroups {
  set(
    groupKey: string,
    groupId: string,
    properties: Record<string, unknown>,
    callback?: MixpanelCallback,
  ): void;
  set_once(
    groupKey: string,
    groupId: string,
    properties: Record<string, unknown>,
    callback?: MixpanelCallback,
  ): void;
  union(
    groupKey: string,
    groupId: string,
    data: Record<string, unknown>,
    callback?: MixpanelCallback,
  ): void;
  remove(
    groupKey: string,
    groupId: string,
    data: Record<string, unknown>,
    callback?: MixpanelCallback,
  ): void;
  unset(
    groupKey: string,
    groupId: string,
    propertyName: string | string[],
    callback?: MixpanelCallback,
  ): void;
  delete_group(
    groupKey: string,
    groupId: string,
    callback?: MixpanelCallback,
  ): void;
}

/**
 * Subset of the Mixpanel SDK instance the destination uses.
 */
export interface MixpanelClient {
  track(
    eventName: string,
    properties: Record<string, unknown>,
    callback?: MixpanelCallback,
  ): void;
  import(
    eventName: string,
    time: Date | number,
    properties?: Record<string, unknown>,
    callback?: MixpanelCallback,
  ): void;
  alias(distinctId: string, alias: string, callback?: MixpanelCallback): void;
  people: MixpanelPeople;
  groups: MixpanelGroups;
}

export interface Settings {
  apiKey: string;
  secret?: string;
  host?: string;
  protocol?: string;
  keepAlive?: boolean;
  geolocate?: boolean;
  debug?: boolean;
  verbose?: boolean;
  test?: boolean;
  identify?: WalkerOSMapping.Value;
  group?: WalkerOSMapping.Value;
  include?: string[];
  useImport?: boolean;
  /** Initialized Mixpanel client instance — set during init(). */
  client?: MixpanelClient;
}

export type InitSettings = Partial<Settings>;

/**
 * Per-rule mapping settings. Keys follow Mixpanel's native method names.
 * No `reset` (not applicable server-side).
 */
export interface Mapping {
  identify?: WalkerOSMapping.Value;
  people?: WalkerOSMapping.Value;
  group?: WalkerOSMapping.Value;
  groupProfile?: WalkerOSMapping.Value;
  useImport?: WalkerOSMapping.Value;
}

/**
 * Environment with optional Mixpanel constructor override for testing.
 * Follows the same pattern as GCP BigQuery's `env.BigQuery`.
 */
export interface Env extends DestinationServer.Env {
  Mixpanel?: { init: (...args: unknown[]) => MixpanelClient };
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
