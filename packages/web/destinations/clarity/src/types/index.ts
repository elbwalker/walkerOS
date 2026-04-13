import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

/**
 * Settings (destination-level).
 *
 * apiKey is the Clarity project ID (e.g. "3t0wlogvdz").
 * consent translates walkerOS consent keys to Clarity's ConsentV2 categories.
 * identify resolves to positional args for Clarity.identify(...).
 */
export interface Settings {
  apiKey: string;
  consent?: Record<string, 'analytics_Storage' | 'ad_Storage'>;
  identify?: WalkerOSMapping.Value;
}

export type InitSettings = Partial<Settings>;

/**
 * Mapping (rule.settings) — per-event overrides.
 *
 * identify — mapping value resolving to { customId, customSessionId?, customPageId?, friendlyName? }
 * include  — overrides destination-level include for this rule
 * set      — explicit custom tag mapping; resolves to Record<string, string | string[]>
 * upgrade  — mapping value resolving to a string reason for Clarity.upgrade(...)
 */
export interface Mapping {
  identify?: WalkerOSMapping.Value;
  set?: WalkerOSMapping.Value;
  upgrade?: WalkerOSMapping.Value;
}

/**
 * Clarity SDK surface — the subset of @microsoft/clarity methods this
 * destination actually uses. Mirrors the default export so tests can mock
 * each method individually. The legacy `consent()` API is intentionally
 * not exposed here — this destination only uses `consentV2`.
 */
export interface ClaritySDK {
  init: (projectId: string) => void;
  identify: (
    customId: string,
    customSessionId?: string,
    customPageId?: string,
    friendlyName?: string,
  ) => void;
  setTag: (key: string, value: string | string[]) => void;
  event: (name: string) => void;
  consentV2: (consentOptions?: {
    ad_Storage: 'granted' | 'denied';
    analytics_Storage: 'granted' | 'denied';
  }) => void;
  upgrade: (reason: string) => void;
}

/**
 * Env — optional override for the vendor SDK. Production leaves this
 * undefined and the destination falls back to the real `@microsoft/clarity`
 * default export. Tests provide a mock via `env.clarity = { ... }`.
 */
export interface Env extends DestinationWeb.Env {
  clarity?: ClaritySDK;
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;

export interface ClarityDestination extends Destination {
  env?: Env;
}

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
