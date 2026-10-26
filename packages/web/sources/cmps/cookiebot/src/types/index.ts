import type { Source, Elb } from '@walkeros/core';

declare module '@walkeros/core' {
  interface SourceMap {
    cookiebot: { type: 'cookiebot'; platform?: 'web' };
  }
}

/**
 * Cookiebot consent object (`window.Cookiebot.consent`).
 *
 * The four categories are booleans Cookiebot always sets. `method` is
 * `'explicit'` when the visitor actively decided, `'implied'` when Cookiebot
 * consented on its own (outside a region that requires consent, an implied
 * banner, or an old consent of unknown method) and `null` without consent.
 */
export interface CookiebotConsent {
  necessary?: boolean;
  preferences?: boolean;
  statistics?: boolean;
  marketing?: boolean;
  method?: string | null;
  stamp?: string;
  [category: string]: boolean | string | null | undefined;
}

/**
 * The subset of the Cookiebot SDK (`window.Cookiebot`) the source reads.
 */
export interface CookiebotAPI {
  consent: CookiebotConsent;
  /** The visitor accepted at least one category. */
  consented?: boolean;
  /** The visitor declined. */
  declined?: boolean;
  /** The visitor answered the banner, or Cookiebot consented for them. */
  hasResponse?: boolean;
}

/**
 * Window surface the source touches: the Cookiebot global and event
 * registration. Narrowed instead of the global `Window`, so the package adds
 * no global declarations that could clash with `@types/cookiebot-sdk`, and
 * test mocks satisfy it without a cast.
 */
export interface CookiebotWindow {
  Cookiebot?: CookiebotAPI;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

/**
 * Settings for the Cookiebot source
 */
export interface Settings {
  /**
   * Map Cookiebot categories to walkerOS consent groups.
   * Keys: Cookiebot categories (necessary, preferences, statistics, marketing)
   * Values: walkerOS consent group names
   *
   * Comparison is case-insensitive. Categories without an entry pass through
   * under their own name, `necessary` among them by default.
   *
   * Default:
   * - preferences -> functional
   * - statistics -> analytics
   * - marketing -> marketing
   */
  categoryMap?: Record<string, string>;

  /**
   * Only process consent the visitor actively gave (`consent.method` is
   * `'explicit'`). Implied consent, which Cookiebot sets on its own, is
   * skipped.
   *
   * Default: true
   */
  explicitOnly?: boolean;
}

/**
 * User input settings (all optional)
 */
export type InitSettings = Partial<Settings>;

/**
 * No mapping configuration for this source
 */
export interface Mapping {}

/**
 * Push function type - uses elb for consent commands
 */
export type Push = Elb.Fn;

/**
 * Environment interface for the Cookiebot source
 */
export interface Env extends Source.BaseEnv {
  window?: CookiebotWindow;
}

/**
 * Types bundle for the Cookiebot source
 */
export type Types = Source.Types<Settings, Mapping, Push, Env, InitSettings>;

/**
 * Config type alias
 */
export type Config = Source.Config<Types>;
