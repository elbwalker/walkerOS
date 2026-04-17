import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

/** Property value types accepted by Heap SDK methods. */
export type HeapPropertyValue = string | number | boolean;

/** Options accepted by heap.load() as the second argument. */
export interface HeapConfig {
  disableTextCapture?: boolean;
  disablePageviewAutocapture?: boolean;
  disableSessionReplay?: boolean;
  secureCookie?: boolean;
  compressCookies?: boolean;
  clearEventPropertiesOnNewUser?: boolean;
  ingestServer?: string;
  trackingServer?: string;
  eventPropertiesStorageMedium?: string;
  metadataStorageMedium?: string;
  [key: string]: unknown;
}

/**
 * Heap SDK surface — the subset of window.heap methods this destination uses.
 * Mirrors the snippet-provided command queue so tests can mock each method.
 */
export interface HeapSDK {
  load: (appId: string, config?: HeapConfig) => void;
  track: (
    event: string,
    properties?: Record<string, HeapPropertyValue>,
  ) => void;
  identify: (identity: string) => void;
  resetIdentity: () => void;
  addUserProperties: (properties: Record<string, HeapPropertyValue>) => void;
  addEventProperties: (properties: Record<string, HeapPropertyValue>) => void;
  clearEventProperties: () => void;
  startTracking: () => void;
  stopTracking: () => void;
  appid?: string;
  config?: HeapConfig;
  q?: unknown[][];
}

/**
 * Settings (destination-level).
 *
 * appId is required (Heap Project Settings → App ID).
 * identify/userProperties resolve every push to keep identity sticky.
 */
export interface Settings {
  /** Heap App ID (required). Find it in Project > Settings > App ID. */
  appId: string;
  /** Disable Heap auto text capture. Default: true. */
  disableTextCapture?: boolean;
  /** Disable Heap automatic pageview tracking. Default: true (walkerOS handles pageviews). */
  disablePageviewAutocapture?: boolean;
  /** Disable Heap session replay. */
  disableSessionReplay?: boolean;
  /** SSL-only cookies. */
  secureCookie?: boolean;
  /** Custom server endpoint (first-party proxy). */
  ingestServer?: string;
  /** Destination-level identity mapping. Resolves to a string for heap.identify(). */
  identify?: WalkerOSMapping.Value;
  /** Destination-level user properties mapping. Resolves to object for heap.addUserProperties(). */
  userProperties?: WalkerOSMapping.Value;
  /** Additional heap.load() config passthrough. */
  heapConfig?: HeapConfig;
}

export type InitSettings = Partial<Settings>;

/**
 * Mapping (rule.settings) — per-event overrides.
 *
 * identify             — resolves to string for heap.identify()
 * reset                — truthy triggers heap.resetIdentity()
 * userProperties       — resolves to object for heap.addUserProperties()
 * eventProperties      — resolves to object for heap.addEventProperties() (persistent)
 * clearEventProperties — truthy triggers heap.clearEventProperties()
 */
export interface Mapping {
  identify?: WalkerOSMapping.Value;
  reset?: boolean | WalkerOSMapping.Value;
  userProperties?: WalkerOSMapping.Value;
  eventProperties?: WalkerOSMapping.Value;
  clearEventProperties?: boolean | WalkerOSMapping.Value;
}

/**
 * Env — optional override for the Heap SDK. Production leaves this
 * undefined and the destination creates the snippet's command queue on
 * window.heap. Tests provide a mock via env.window.heap = { ... }.
 */
export interface Env extends DestinationWeb.Env {
  window: {
    heap: HeapSDK;
  };
}

declare global {
  interface Window {
    heap?: HeapSDK;
  }
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
