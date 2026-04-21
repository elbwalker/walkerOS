import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

/**
 * Settings (destination-level).
 *
 * siteId is the numeric Hotjar site ID from the dashboard.
 * identify resolves to { userId, ...attributes } for Hotjar.identify().
 */
export interface Settings {
  siteId: number;
  hotjarVersion?: number;
  debug?: boolean;
  nonce?: string;
  identify?: WalkerOSMapping.Value;
}

export type InitSettings = Partial<Settings>;

/**
 * Mapping (rule.settings) -- per-event overrides.
 *
 * identify    -- mapping value resolving to { userId, ...attributes }
 * stateChange -- mapping value resolving to a path string for SPA route changes
 */
export interface Mapping {
  identify?: WalkerOSMapping.Value;
  stateChange?: WalkerOSMapping.Value;
}

/**
 * Hotjar SDK surface -- the subset of @hotjar/browser methods this
 * destination uses. Mirrors the default export so tests can mock
 * each method individually.
 */
export interface HotjarSDK {
  init: (
    hotjarId: number,
    hotjarVersion: number,
    opts?: { debug?: boolean; nonce?: string },
  ) => boolean;
  event: (actionName: string) => boolean;
  identify: (
    userId: string | null,
    userInfo: Record<string, string | number | Date | boolean>,
  ) => boolean;
  stateChange: (relativePath: string) => boolean;
  isReady: () => boolean;
}

/**
 * Env -- optional override for the vendor SDK. Production leaves this
 * undefined and the destination falls back to the real @hotjar/browser
 * default export. Tests provide a mock via env.hotjar = { ... }.
 */
export interface Env extends DestinationWeb.Env {
  hotjar?: HotjarSDK;
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
