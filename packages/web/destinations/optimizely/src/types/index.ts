import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

/**
 * Destination-level settings.
 */
export interface Settings {
  /** Optimizely Feature Experimentation SDK key. Required. */
  sdkKey: string;
  /** walkerOS mapping value to resolve userId for experiment bucketing. */
  userId?: WalkerOSMapping.Value;
  /** User attributes for audience targeting, applied to every event. */
  attributes?: WalkerOSMapping.Value;
  /** Polling interval for datafile updates in ms. Default: 60000. */
  updateInterval?: number;
  /** Auto-update datafile via polling. Default: true. */
  autoUpdate?: boolean;
  /** Batch event processor: events per batch. Default: 10. */
  batchSize?: number;
  /** Batch event processor: flush interval in ms. Default: 1000. */
  flushInterval?: number;
  /** Skip ODP manager initialization. Default: true. */
  skipOdp?: boolean;
  /** Runtime state -- not user-facing. Mutated by init/push. */
  _state?: RuntimeState;
}

export interface RuntimeState {
  /** The Optimizely client instance (typed as OptimizelyClient). */
  client?: OptimizelyClient;
  /** Cached user context. Recreated when userId changes. */
  userContext?: OptimizelyUserContext;
  /** Last resolved userId to detect identity changes. */
  lastUserId?: string;
}

export type InitSettings = Partial<Settings>;

/**
 * Per-rule mapping settings.
 */
export interface Mapping {
  /** Override event key sent to Optimizely. If omitted, event.name is used. */
  eventKey?: string;
  /** Revenue mapping. Resolves to integer (cents). Passed as eventTags.revenue. */
  revenue?: WalkerOSMapping.Value;
  /** Numeric value mapping. Resolves to float. Passed as eventTags.value. */
  value?: WalkerOSMapping.Value;
  /** Additional event tags. Resolves to Record<string, unknown>. */
  eventTags?: WalkerOSMapping.Value;
  /** Per-event user attributes override. Merged onto user context for this event. */
  attributes?: WalkerOSMapping.Value;
}

/**
 * OptimizelyClient -- the subset of the Optimizely SDK client the destination
 * actually uses. Tests provide a mock via env.optimizely.
 */
export interface OptimizelyClient {
  onReady: () => Promise<{ success: boolean }>;
  createUserContext: (
    userId: string,
    attributes?: Record<string, unknown>,
  ) => OptimizelyUserContext | null;
  close: () => void;
}

/**
 * OptimizelyUserContext -- user context methods the destination calls.
 */
export interface OptimizelyUserContext {
  trackEvent: (eventKey: string, eventTags?: Record<string, unknown>) => void;
  setAttribute: (key: string, value: unknown) => void;
}

/**
 * OptimizelySDK -- factory functions the destination imports from the SDK.
 * Tests provide this via env.optimizely to avoid importing the real SDK.
 */
export interface OptimizelySDK {
  createInstance: (config: Record<string, unknown>) => OptimizelyClient;
  createPollingProjectConfigManager: (
    config: Record<string, unknown>,
  ) => unknown;
  createBatchEventProcessor: (config: Record<string, unknown>) => unknown;
}

/**
 * Env -- optional SDK override. Production leaves env.optimizely undefined
 * and the destination falls back to the real @optimizely/optimizely-sdk
 * import. Tests provide a mock via env.optimizely.
 */
export interface Env extends DestinationWeb.Env {
  optimizely?: OptimizelySDK;
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
