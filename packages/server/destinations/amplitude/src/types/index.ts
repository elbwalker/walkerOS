import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer } from '@walkeros/server-core';

/**
 * Amplitude SDK surface -- the subset of @amplitude/analytics-node the
 * destination actually uses. Tests provide a mock via env.amplitude;
 * production uses the real SDK import.
 *
 * Key difference from web: no setUserId/setDeviceId/setSessionId.
 * Identity is per-event via EventOptions on every SDK call.
 */
export interface AmplitudeSDK {
  init: (
    apiKey: string,
    options?: Record<string, unknown>,
  ) => { promise: Promise<void> };
  track: (
    eventType: string,
    eventProperties?: Record<string, unknown>,
    eventOptions?: EventOptions,
  ) => void;
  identify: (identify: IdentifyInstance, eventOptions?: EventOptions) => void;
  revenue: (revenue: RevenueInstance, eventOptions?: EventOptions) => void;
  setGroup: (
    groupType: string,
    groupName: string | string[],
    eventOptions?: EventOptions,
  ) => void;
  groupIdentify: (
    groupType: string,
    groupName: string,
    identify: IdentifyInstance,
    eventOptions?: EventOptions,
  ) => void;
  setOptOut: (optOut: boolean) => void;
  flush: () => { promise: Promise<void> };
  Identify: new () => IdentifyInstance;
  Revenue: new () => RevenueInstance;
}

/**
 * Per-event identity and metadata fields. Passed to every SDK call.
 * Maps directly to Amplitude's EventOptions type from the Node SDK.
 */
export interface EventOptions {
  user_id?: string;
  device_id?: string;
  session_id?: number;
  time?: number;
  insert_id?: string;
  ip?: string;
  city?: string;
  country?: string;
  region?: string;
  language?: string;
  platform?: string;
  os_name?: string;
  os_version?: string;
  device_brand?: string;
  device_manufacturer?: string;
  device_model?: string;
  app_version?: string;
  carrier?: string;
  user_agent?: string;
  groups?: Record<string, unknown>;
  plan?: Record<string, unknown>;
  ingestion_metadata?: Record<string, unknown>;
  partner_id?: string;
  extra?: Record<string, unknown>;
}

/** Chainable Identify -- mirrors @amplitude/analytics-node Identify class. */
export interface IdentifyInstance {
  set: (property: string, value: unknown) => IdentifyInstance;
  setOnce: (property: string, value: unknown) => IdentifyInstance;
  add: (property: string, value: number) => IdentifyInstance;
  append: (property: string, value: unknown) => IdentifyInstance;
  prepend: (property: string, value: unknown) => IdentifyInstance;
  preInsert: (property: string, value: unknown) => IdentifyInstance;
  postInsert: (property: string, value: unknown) => IdentifyInstance;
  remove: (property: string, value: unknown) => IdentifyInstance;
  unset: (property: string) => IdentifyInstance;
  clearAll: () => IdentifyInstance;
}

/** Chainable Revenue -- mirrors @amplitude/analytics-node Revenue class. */
export interface RevenueInstance {
  setProductId: (id: string) => RevenueInstance;
  setPrice: (price: number) => RevenueInstance;
  setQuantity: (quantity: number) => RevenueInstance;
  setRevenueType: (type: string) => RevenueInstance;
  setCurrency: (currency: string) => RevenueInstance;
  setRevenue: (revenue: number) => RevenueInstance;
  setReceipt: (receipt: string) => RevenueInstance;
  setReceiptSig: (signature: string) => RevenueInstance;
  setEventProperties: (properties: Record<string, unknown>) => RevenueInstance;
}

/**
 * Destination-level settings. apiKey is required; all other fields
 * are optional and passed through to the Amplitude Node SDK init().
 */
export interface Settings {
  apiKey: string;
  serverZone?: 'US' | 'EU';
  flushIntervalMillis?: number;
  flushQueueSize?: number;
  flushMaxRetries?: number;
  useBatch?: boolean;
  minIdLength?: number;
  serverUrl?: string;
  logLevel?: number;
  optOut?: boolean;
  offline?: boolean;
  enableRequestBodyCompression?: boolean;
  plan?: Record<string, unknown>;
  ingestionMetadata?: Record<string, unknown>;

  /** walkerOS mapping value for per-event identity resolution. */
  identify?: WalkerOSMapping.Value;
  /** walkerOS mapping value for per-event EventOptions (time, insert_id, ip, etc). */
  eventOptions?: WalkerOSMapping.Value;
  /** Sections to include as event_properties (e.g., ['data', 'globals']). */
  include?: string[];
}

export type InitSettings = Partial<Settings>;

/**
 * Per-rule mapping settings. Each is a walkerOS mapping value resolved
 * via getMappingValue(). Revenue supports loop for multi-item orders.
 */
export interface Mapping {
  identify?: WalkerOSMapping.Value;
  revenue?: WalkerOSMapping.Value;
  group?: WalkerOSMapping.Value;
  groupIdentify?: WalkerOSMapping.Value;
  eventOptions?: WalkerOSMapping.Value;
  include?: string[];
}

/**
 * Env -- optional SDK override. Production leaves this undefined and the
 * destination falls back to the real @amplitude/analytics-node import.
 * Tests provide a mock via env.amplitude.
 */
export interface Env extends DestinationServer.Env {
  amplitude?: AmplitudeSDK;
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
