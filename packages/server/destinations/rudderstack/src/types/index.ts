import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer } from '@walkeros/server-core';

export interface Settings {
  /** RudderStack source write key (required). */
  writeKey: string;
  /** RudderStack data plane URL (required). */
  dataPlaneUrl: string;
  /** walkerOS mapping value path to resolve userId from each event. */
  userId?: string;
  /** walkerOS mapping value path to resolve anonymousId from each event. */
  anonymousId?: string;
  /** Destination-level identity mapping (fires identify() on first push / change). */
  identify?: WalkerOSMapping.Value;
  /** Destination-level group mapping (fires group() on first push / change). */
  group?: WalkerOSMapping.Value;
  /** Downstream destination filtering. Passthrough to SDK integrations param. */
  integrations?: Record<string, boolean | Record<string, unknown>>;
  // SDK constructor options (passthrough)
  /** API path. Default: '/v1/batch'. */
  path?: string;
  /** Events to enqueue before flushing. Default: 20. */
  flushAt?: number;
  /** Max milliseconds before auto-flush. Default: 10000. */
  flushInterval?: number;
  /** Maximum batch payload size in bytes. Default: 460800 (~500KB). */
  maxQueueSize?: number;
  /** Maximum in-memory queue length. Default: 20000. */
  maxInternalQueueSize?: number;
  /** Log level. Default: 'info'. */
  logLevel?: string;
  /** Retry attempts for failed batches. Default: 3. */
  retryCount?: number;
  /** Completely disable the SDK. Default: false. */
  enable?: boolean;
  /** Enable gzip compression. Default: true. */
  gzip?: boolean;
  /** Runtime state -- not user-facing. Mutated by init/push. */
  _analytics?: unknown;
  _state?: RuntimeState;
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
 * which RudderStack SDK methods to call.
 */
export interface Mapping {
  identify?: WalkerOSMapping.Value;
  group?: WalkerOSMapping.Value;
  page?: WalkerOSMapping.Value | boolean;
  screen?: WalkerOSMapping.Value | boolean;
  alias?: WalkerOSMapping.Value;
}

/**
 * Env -- optional SDK override. Production leaves this undefined and the
 * destination creates a real Analytics instance. Tests provide a mock via
 * env.analytics.
 */
export interface Env extends DestinationServer.Env {
  analytics?: RudderStackAnalyticsMock;
}

/**
 * Mock-friendly interface for the Analytics instance methods the
 * destination actually calls. Tests can provide this via env.analytics
 * instead of the real SDK.
 */
export interface RudderStackAnalyticsMock {
  track: (params: Record<string, unknown>) => void;
  identify: (params: Record<string, unknown>) => void;
  group: (params: Record<string, unknown>) => void;
  page: (params: Record<string, unknown>) => void;
  screen: (params: Record<string, unknown>) => void;
  alias: (params: Record<string, unknown>) => void;
  flush: (callback?: (err?: Error, data?: unknown) => void) => Promise<void>;
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
