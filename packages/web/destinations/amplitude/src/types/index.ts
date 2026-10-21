import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';
import type {
  Types as AmplitudeTypes,
  UnifiedOptions,
} from '@amplitude/unified';
import type { SessionReplayOptions } from '@amplitude/plugin-session-replay-browser';
import type { ExperimentPluginConfig } from '@amplitude/plugin-experiment-browser';
import type { InitOptions as EngagementInitOptions } from '@amplitude/engagement-browser';

// Amplitude's BrowserOptions has an `identify` field that conflicts with our
// walkerOS mapping-based `identify`. Omit it so Settings can re-declare it.
type BrowserOptions = Omit<AmplitudeTypes.BrowserOptions, 'identify'>;
export type AmplitudeBrowserOptions = AmplitudeTypes.BrowserOptions;

/**
 * Destination-level settings.
 *
 * All Amplitude `BrowserOptions` are passthrough init options — extending the
 * SDK type directly keeps IntelliSense complete and prevents drift. The
 * destination adds:
 *  - `apiKey` (required) — first arg to `amplitude.init(...)`
 *  - `identify` — destination-level identity mapping
 *  - `sessionReplay` / `experiment` / `engagement` — optional plugin configs
 *  - `_state` — runtime state (not user-facing, mutated by init/push)
 */
export interface Settings extends BrowserOptions {
  apiKey: string;
  identify?: WalkerOSMapping.Value;
  sessionReplay?: SessionReplayOptions;
  experiment?: ExperimentPluginConfig & { deploymentKey: string };
  engagement?: boolean | EngagementInitOptions;
  /** Runtime state — populated by init() and mutated by push(). Not user-facing. */
  _state?: RuntimeState;
}

export interface RuntimeState {
  /** Last-set identity values, used to skip redundant setUserId/setDeviceId/setSessionId calls. */
  lastIdentity?: {
    user?: string;
    device?: string;
    session?: number;
  };
}

export type InitSettings = Partial<Settings>;

/**
 * Per-rule mapping settings. Every feature here is a walkerOS mapping value
 * resolved via getMappingValue(). Revenue uniquely supports loop to produce
 * an array of items → N amplitude.revenue() calls.
 */
export interface Mapping {
  identify?: WalkerOSMapping.Value;
  revenue?: WalkerOSMapping.Value;
  group?: WalkerOSMapping.Value;
  groupIdentify?: WalkerOSMapping.Value;
  reset?: WalkerOSMapping.Value | boolean;
}

/**
 * Amplitude SDK surface: the subset of @amplitude/unified the
 * destination actually uses. Mirrors the real client's methods so tests can
 * mock each one via env.amplitude. Generic over the Identify and Revenue
 * instances, so the real SDK gets back the instances it created.
 */
export interface AmplitudeSDK<
  I extends IdentifyInstance = IdentifyInstance,
  R extends RevenueInstance = RevenueInstance,
> {
  /** Analytics only, the plugins none. */
  init: (apiKey: string, options?: AmplitudeBrowserOptions) => unknown;
  /** Analytics plus Session Replay, Experiment and Guides & Surveys. */
  initAll: (apiKey: string, options?: UnifiedOptions) => unknown;
  track: (
    eventType: string,
    eventProperties?: Record<string, unknown>,
  ) => unknown;
  identify: (identify: I) => unknown;
  revenue: (revenue: R) => unknown;
  reset: () => unknown;
  setOptOut: (optOut: boolean) => unknown;
  setUserId: (userId: string | undefined) => unknown;
  setDeviceId: (deviceId: string) => unknown;
  setSessionId: (sessionId: number) => unknown;
  setGroup: (groupType: string, groupName: string | string[]) => unknown;
  groupIdentify: (groupType: string, groupName: string, identify: I) => unknown;
  Identify: new () => I;
  Revenue: new () => R;
}

/** Chainable Identify, as the @amplitude/unified Identify class. */
export interface IdentifyInstance {
  set(property: string, value: unknown): IdentifyInstance;
  setOnce(property: string, value: unknown): IdentifyInstance;
  add(property: string, value: number): IdentifyInstance;
  append(property: string, value: unknown): IdentifyInstance;
  prepend(property: string, value: unknown): IdentifyInstance;
  preInsert(property: string, value: unknown): IdentifyInstance;
  postInsert(property: string, value: unknown): IdentifyInstance;
  remove(property: string, value: unknown): IdentifyInstance;
  unset(property: string): IdentifyInstance;
  clearAll(): IdentifyInstance;
}

/** Chainable Revenue, as the @amplitude/unified Revenue class. */
export interface RevenueInstance {
  setProductId(id: string): RevenueInstance;
  setPrice(price: number): RevenueInstance;
  setQuantity(quantity: number): RevenueInstance;
  setRevenueType(type: string): RevenueInstance;
  setCurrency(currency: string): RevenueInstance;
  setRevenue(revenue: number): RevenueInstance;
  setReceipt(receipt: string): RevenueInstance;
  setReceiptSig(signature: string): RevenueInstance;
  setEventProperties(properties: Record<string, unknown>): RevenueInstance;
}

/**
 * Env — optional SDK override. Production leaves this undefined and the
 * destination falls back to the real @amplitude/unified module
 * import. Tests provide a mock via env.amplitude = { ... }.
 */
export interface Env extends DestinationWeb.Env {
  amplitude?: AmplitudeSDK;
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;

export interface AmplitudeDestination extends Destination {
  env?: Env;
}

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
