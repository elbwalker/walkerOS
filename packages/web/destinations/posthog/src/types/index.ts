import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';
// Import SDK types directly — never duplicate. Verified against posthog-js@1.367.0.
import type { PostHogConfig, Properties } from 'posthog-js';

/**
 * Destination-level settings.
 *
 * PostHog's `PostHogConfig` interface has ~80 fields — extending the SDK type
 * directly keeps IntelliSense complete and prevents drift. The destination adds:
 *  - `apiKey` (required) — first arg to `posthog.init(...)`, NOT an init option
 *  - `identify` — destination-level identity mapping
 *  - `include` — event sections flattened into `capture()` properties
 *  - `group` — destination-level group association
 *  - `_state` — runtime state (not user-facing, mutated by init/push)
 *
 * All other walkerOS-specific mapping features live under mapping.settings
 * (see Mapping interface below). Built-in PostHog features (session_recording,
 * advanced_disable_flags, disable_surveys, capture_heatmaps, capture_exceptions,
 * bootstrap, cookieless_mode, ...) are passthrough via PostHogConfig.
 */
export interface Settings extends Partial<PostHogConfig> {
  /** PostHog project API key (e.g. "phc_XXX"). First arg to posthog.init(). */
  apiKey: string;
  /** Destination-level identity mapping, resolved on first push. */
  identify?: WalkerOSMapping.Value;
  /** Destination-level group association, resolved on first push. */
  group?: WalkerOSMapping.Value;
  /** Runtime state — populated by init() and mutated by push(). Not user-facing. */
  _state?: RuntimeState;
}

export interface RuntimeState {
  /** Last-resolved identity values, used to skip redundant identify/group calls. */
  lastIdentity?: {
    distinctId?: string;
  };
  lastGroup?: {
    type?: string;
    key?: string;
  };
}

export type InitSettings = Partial<Settings>;

/**
 * Per-rule mapping settings. Every feature here is a walkerOS mapping value
 * resolved via getMappingValue(). The resolved object's keys drive which
 * SDK methods are called.
 *
 * - identify: { distinctId?, $set?, $set_once? } → posthog.identify() OR posthog.setPersonProperties()
 * - group:    { type, key, properties? } → posthog.group()
 * - reset:    boolean → posthog.reset()
 * - include:  string[] → flattened properties (overrides destination-level)
 */
export interface Mapping {
  identify?: WalkerOSMapping.Value;
  group?: WalkerOSMapping.Value;
  reset?: WalkerOSMapping.Value | boolean;
}

/**
 * PostHog SDK surface — the subset of `posthog-js` the destination actually
 * uses. Mirrors the real module's default singleton export shape. Tests mock
 * via env.posthog to intercept every call.
 */
export interface PostHogSDK {
  init: (
    token: string,
    config?: Partial<PostHogConfig> & {
      loaded?: (posthog: PostHogSDK) => void;
    },
    name?: string,
  ) => PostHogSDK;
  capture: (eventName: string, properties?: Properties) => void;
  identify: (
    distinctId?: string,
    userPropertiesToSet?: Properties,
    userPropertiesToSetOnce?: Properties,
  ) => void;
  setPersonProperties: (
    userPropertiesToSet?: Properties,
    userPropertiesToSetOnce?: Properties,
  ) => void;
  group: (
    groupType: string,
    groupKey: string,
    groupPropertiesToSet?: Properties,
  ) => void;
  reset: (resetDeviceId?: boolean) => void;
  opt_in_capturing: (options?: {
    captureEventName?: string | null | false;
    captureProperties?: Properties;
  }) => void;
  opt_out_capturing: () => void;
}

/**
 * Env — optional SDK override. Production leaves this undefined and the
 * destination falls back to the real `posthog-js` default export. Tests
 * provide a mock via env.posthog = { ... }.
 */
export interface Env extends DestinationWeb.Env {
  posthog?: PostHogSDK;
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;

export interface PostHogDestination extends Destination {
  env?: Env;
}

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
