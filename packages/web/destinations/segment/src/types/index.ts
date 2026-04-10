import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';
import type {
  AnalyticsBrowserSettings,
  InitOptions,
} from '@segment/analytics-next';

/**
 * Destination-level settings.
 *
 * Extends Segment's `InitOptions` (minus the `group` key which clashes with
 * walkerOS's own `group` mapping) so every passthrough option (cookie,
 * storage, integrations, plan, etc.) keeps IntelliSense intact. walkerOS
 * adds:
 *  - `apiKey` (required) — maps to `writeKey` in `AnalyticsBrowser.load()`
 *  - `identify` — destination-level identity mapping (Segment `identify()`)
 *  - `group` — destination-level group mapping (Segment `group()`)
 *  - `include` — event sections flattened into track `properties`
 *  - `consent` — walkerOS consent key → Segment category name mapping
 *  - `_state` — runtime state (not user-facing, mutated by init/push)
 */
export interface Settings extends Omit<InitOptions, 'group'> {
  /** Segment write key. Maps to `writeKey` in the load() settings arg. */
  apiKey: string;
  /** walkerOS mapping value resolving to an identity object (userId, traits, anonymousId). */
  identify?: WalkerOSMapping.Value;
  /** walkerOS mapping value resolving to a group object (groupId, traits). */
  group?: WalkerOSMapping.Value;
  /**
   * Mapping from walkerOS consent keys → Segment `categoryPreferences` keys.
   * Example: { marketing: "Advertising", analytics: "Analytics" }
   * If omitted, walkerOS keys are forwarded 1:1.
   */
  consent?: Record<string, string>;
  /** Runtime state — populated by init() and mutated by push(). Not user-facing. */
  _state?: RuntimeState;
}

export interface RuntimeState {
  /** Last-set identity values, used to skip redundant identify() calls. */
  lastIdentity?: {
    userId?: string;
    anonymousId?: string;
    traitsHash?: string;
  };
  /** Last-set group assignment, used to skip redundant group() calls. */
  lastGroup?: {
    groupId?: string;
    traitsHash?: string;
  };
  /** Holds the AnalyticsBrowser instance created in init(). */
  analytics?: SegmentAnalytics;
  /** True once load() has been called (may be deferred pending consent). */
  loaded?: boolean;
}

export type InitSettings = Partial<Settings>;

/**
 * Per-rule mapping settings. Every feature here is a walkerOS mapping
 * value resolved via getMappingValue(). The resolved object's keys drive
 * which Segment SDK methods to call.
 */
export interface Mapping {
  identify?: WalkerOSMapping.Value;
  group?: WalkerOSMapping.Value;
  page?: WalkerOSMapping.Value | boolean;
  reset?: WalkerOSMapping.Value | boolean;
}

/**
 * Segment SDK surface — the subset of @segment/analytics-next the
 * destination actually uses. Mirrors the AnalyticsBrowser instance shape
 * so tests can mock each method individually via env.analytics.
 */
export interface SegmentAnalytics {
  track: (
    event: string,
    properties?: Record<string, unknown>,
    options?: SegmentEventOptions,
  ) => Promise<unknown> | void;
  identify: (
    userId?: string | Record<string, unknown>,
    traits?: Record<string, unknown>,
    options?: SegmentEventOptions,
  ) => Promise<unknown> | void;
  group: (
    groupId: string,
    traits?: Record<string, unknown>,
    options?: SegmentEventOptions,
  ) => Promise<unknown> | void;
  page: (
    category?: string | null,
    name?: string | null,
    properties?: Record<string, unknown>,
    options?: SegmentEventOptions,
  ) => Promise<unknown> | void;
  alias: (
    to: string,
    from?: string,
    options?: SegmentEventOptions,
  ) => Promise<unknown> | void;
  reset: () => Promise<unknown> | void;
  setAnonymousId: (id: string) => Promise<unknown> | void;
}

/**
 * Segment event options — the fourth argument to track/identify/group/page
 * that carries context and integration overrides. The destination uses
 * this to stamp consent context on every event.
 */
export interface SegmentEventOptions {
  context?: {
    consent?: {
      categoryPreferences?: Record<string, boolean>;
    };
    [key: string]: unknown;
  };
  integrations?: Record<string, boolean | Record<string, unknown>>;
}

/**
 * The module namespace used for `env?.analytics ?? realSegment`.
 * AnalyticsBrowser is the class; tests mock with a factory that returns
 * an object matching SegmentAnalytics.
 *
 * Task 1 verified: `AnalyticsBrowser.load(settings, options)` returns an
 * `AnalyticsBrowser` instance **synchronously**. The instance buffers
 * method calls until the internal load promise resolves.
 */
export interface SegmentSDK {
  load: (
    settings: AnalyticsBrowserSettings,
    options?: InitOptions,
  ) => SegmentAnalytics;
}

/**
 * Env — optional SDK override. Production leaves this undefined and the
 * destination falls back to the real @segment/analytics-next module.
 * Tests provide a mock via env.analytics = { ... }.
 */
export interface Env extends DestinationWeb.Env {
  analytics?: SegmentSDK;
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;

export interface SegmentDestination extends Destination {
  env?: Env;
}

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
