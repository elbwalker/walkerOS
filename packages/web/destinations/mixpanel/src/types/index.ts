import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';
// mixpanel-browser's Config interface covers every init option (api_host,
// persistence, batch_requests, record_sessions_percent, etc.). Extending it
// directly keeps IntelliSense complete and prevents drift from the SDK.
import type { Config as MixpanelConfig } from 'mixpanel-browser';

/**
 * Destination-level settings.
 *
 * Extends Mixpanel's `Config` so every `mixpanel.init()` option flows through
 * without per-field plumbing. The destination adds walkerOS-specific keys:
 *  - `apiKey` (required) — maps to the first arg of `mixpanel.init()`
 *  - `identify` — destination-level identity mapping
 *  - `include` — event sections flattened into `track()` properties
 *  - `group` — destination-level group association
 *  - `_state` — runtime state (not user-facing, mutated by init/push)
 */
export interface Settings extends Partial<MixpanelConfig> {
  apiKey: string;
  identify?: WalkerOSMapping.Value;
  group?: WalkerOSMapping.Value;
  /** Runtime state — populated by init() and mutated by push(). Not user-facing. */
  _state?: RuntimeState;
}

export interface RuntimeState {
  /** Last-set distinct_id, used to skip redundant identify() calls. */
  lastIdentity?: {
    distinctId?: string;
  };
}

export type InitSettings = Partial<Settings>;

/**
 * Per-rule mapping settings. Every feature here is a walkerOS mapping value
 * resolved via getMappingValue(). Keys follow Mixpanel's native method names:
 *  - `identify` → `mixpanel.identify(distinctId)`
 *  - `people` → `mixpanel.people.{set,set_once,increment,append,union,remove,unset,delete_user}`
 *  - `group` → `mixpanel.set_group(key, id)`
 *  - `groupProfile` → `mixpanel.get_group(key, id).{set,set_once,unset,union,remove,delete}`
 *  - `reset` → `mixpanel.reset()`
 */
export interface Mapping {
  identify?: WalkerOSMapping.Value;
  people?: WalkerOSMapping.Value;
  group?: WalkerOSMapping.Value;
  groupProfile?: WalkerOSMapping.Value;
  reset?: WalkerOSMapping.Value | boolean;
}

/**
 * The `people` namespace on the mixpanel singleton. Mirrors the real SDK
 * shape so tests can spy each method individually.
 */
export interface MixpanelPeople {
  set: (
    prop: string | Record<string, unknown>,
    to?: unknown,
    callback?: () => void,
  ) => void;
  set_once: (
    prop: string | Record<string, unknown>,
    to?: unknown,
    callback?: () => void,
  ) => void;
  increment: (
    prop: string | Record<string, number>,
    by?: number,
    callback?: () => void,
  ) => void;
  append: (
    prop: string | Record<string, unknown>,
    value?: unknown,
    callback?: () => void,
  ) => void;
  union: (
    prop: string | Record<string, unknown[]>,
    value?: unknown[],
    callback?: () => void,
  ) => void;
  remove: (
    prop: string | Record<string, unknown>,
    value?: unknown,
    callback?: () => void,
  ) => void;
  unset: (prop: string | string[], callback?: () => void) => void;
  delete_user: () => void;
}

/**
 * The handle returned by `mixpanel.get_group(key, id)`. Supports property
 * operations on the group profile.
 */
export interface MixpanelGroup {
  set: (
    prop: string | Record<string, unknown>,
    to?: unknown,
    callback?: () => void,
  ) => void;
  set_once: (
    prop: string | Record<string, unknown>,
    to?: unknown,
    callback?: () => void,
  ) => void;
  unset: (prop: string | string[], callback?: () => void) => void;
  union: (
    prop: string | Record<string, unknown[]>,
    value?: unknown[],
    callback?: () => void,
  ) => void;
  remove: (
    prop: string | Record<string, unknown>,
    value?: unknown,
    callback?: () => void,
  ) => void;
  delete: () => void;
}

/**
 * Mixpanel SDK surface — the subset of `mixpanel-browser` the destination
 * actually uses. Mirrors the singleton's shape so tests can mock the whole
 * object via env.mixpanel.
 */
export interface MixpanelSDK {
  init: (
    token: string,
    config?: Partial<MixpanelConfig>,
    name?: string,
  ) => void;
  track: (
    event: string,
    properties?: Record<string, unknown>,
    callback?: () => void,
  ) => void;
  identify: (distinctId?: string) => void;
  reset: () => void;
  set_group: (
    groupKey: string,
    groupIds: string | string[],
    callback?: () => void,
  ) => void;
  get_group: (groupKey: string, groupId: string) => MixpanelGroup;
  opt_in_tracking: (options?: Record<string, unknown>) => void;
  opt_out_tracking: (options?: Record<string, unknown>) => void;
  stop_batch_senders?: () => void;
  people: MixpanelPeople;
}

/**
 * Env — optional SDK override. Production leaves this undefined and the
 * destination falls back to the real `mixpanel-browser` default export.
 * Tests provide a mock via env.mixpanel = { ... }.
 */
export interface Env extends DestinationWeb.Env {
  mixpanel?: MixpanelSDK;
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;

export interface MixpanelDestination extends Destination {
  env?: Env;
}

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
