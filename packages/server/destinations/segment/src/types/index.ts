import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer } from '@walkeros/server-core';

export interface Settings {
  /** Segment source write key (required). */
  writeKey: string;
  /** walkerOS mapping value path to resolve userId from each event. */
  userId?: string;
  /** walkerOS mapping value path to resolve anonymousId from each event. */
  anonymousId?: string;
  /** Destination-level identity mapping (fires identify() on first push / change). */
  identify?: WalkerOSMapping.Value;
  /** Destination-level group mapping (fires group() on first push / change). */
  group?: WalkerOSMapping.Value;
  /** walkerOS consent key -> Segment categoryPreferences key mapping. */
  consent?: Record<string, string>;
  /** Downstream destination filtering. Passthrough to SDK. */
  integrations?: Record<string, boolean | Record<string, unknown>>;
  // SDK constructor options (passthrough)
  /** Base URL of Segment API. Default: 'https://api.segment.io'. */
  host?: string;
  /** API path. Default: '/v1/batch'. */
  path?: string;
  /** Events to enqueue before flushing. Default: 15. */
  flushAt?: number;
  /** Max milliseconds before auto-flush. Default: 10000. */
  flushInterval?: number;
  /** Retry attempts for failed batches. Default: 3. */
  maxRetries?: number;
  /** HTTP request timeout (ms). Default: 10000. */
  httpRequestTimeout?: number;
  /** Completely disable the SDK. Default: false. */
  disable?: boolean;
  /** Runtime state -- not user-facing. Mutated by init/push. */
  _analytics?: SegmentAnalyticsMock;
  _state?: RuntimeState;
  /** The running flush; the next one waits for it. Runtime only. */
  _flushing?: Promise<void>;
}

export interface RuntimeState {
  lastIdentity?: {
    userId?: string;
    anonymousId?: string;
    traitsHash?: string;
  };
  lastGroup?: {
    groupId?: string;
    traitsHash?: string;
  };
}

export type InitSettings = Partial<Settings>;

/**
 * Per-rule mapping settings. Every feature is a walkerOS mapping value
 * resolved via getMappingValue(). The resolved object's keys drive
 * which Segment SDK methods to call.
 */
export interface Mapping {
  identify?: WalkerOSMapping.Value;
  group?: WalkerOSMapping.Value;
  page?: WalkerOSMapping.Value | boolean;
  screen?: WalkerOSMapping.Value | boolean;
}

/**
 * Env -- optional SDK override. Production leaves this undefined and the
 * destination creates a real Analytics instance. Tests provide a mock via
 * env.analytics.
 */
export interface Env extends DestinationServer.Env {
  analytics?: SegmentAnalyticsMock;
}

/**
 * Mock-friendly interface for the Analytics instance methods the
 * destination actually calls. Tests can provide this via env.analytics
 * instead of the real SDK.
 */
/** Called once the SDK delivered the call, with the reason if it failed. */
export type SegmentCallback = (error?: unknown) => void;

export interface SegmentAnalyticsMock {
  track: (
    params: Record<string, unknown>,
    callback?: SegmentCallback,
  ) => unknown;
  identify: (
    params: Record<string, unknown>,
    callback?: SegmentCallback,
  ) => unknown;
  group: (
    params: Record<string, unknown>,
    callback?: SegmentCallback,
  ) => unknown;
  page: (
    params: Record<string, unknown>,
    callback?: SegmentCallback,
  ) => unknown;
  screen: (
    params: Record<string, unknown>,
    callback?: SegmentCallback,
  ) => unknown;
  /** Sends what the SDK holds; resolves once it is delivered. */
  flush: () => Promise<void>;
  closeAndFlush: (opts?: { timeout?: number }) => Promise<void>;
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
export type PushBatchFn = CoreDestination.PushBatchFn<Types>;
export type PartialConfig = DestinationServer.PartialConfig<Types>;
export type PushEvents = DestinationServer.PushEvents<Mapping>;
export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
