import type { Source, Elb } from '@walkeros/core';

/**
 * CookieFirst consent object structure
 */
export interface CookieFirstConsent {
  necessary?: boolean;
  functional?: boolean;
  performance?: boolean;
  advertising?: boolean;
  [category: string]: boolean | undefined;
}

/**
 * CookieFirst global API interface
 */
export interface CookieFirstAPI {
  consent: CookieFirstConsent | null;
}

declare global {
  interface Window {
    CookieFirst?: CookieFirstAPI;
    [key: string]: CookieFirstAPI | unknown;
  }

  interface WindowEventMap {
    cf_init: Event;
    cf_consent: CustomEvent<CookieFirstConsent>;
  }
}

/**
 * Settings for CookieFirst source
 */
export interface Settings {
  /**
   * Map CookieFirst categories to walkerOS consent groups.
   * Keys: CookieFirst category names
   * Values: walkerOS consent group names
   *
   * Default maps to standard walkerOS groups:
   * - necessary → functional
   * - functional → functional
   * - performance → analytics
   * - advertising → marketing
   */
  categoryMap?: Record<string, string>;

  /**
   * Only process explicit consent (user made a choice).
   * When true: Ignores consent if CookieFirst.consent is null
   * When false: Processes any consent state including defaults
   *
   * Default: true
   */
  explicitOnly?: boolean;

  /**
   * Custom name for window.CookieFirst object.
   * Some implementations use a different global name.
   *
   * Default: 'CookieFirst'
   */
  globalName?: string;
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
 * Environment interface for CookieFirst source
 */
export interface Env extends Source.BaseEnv {
  window?: Window & typeof globalThis;
}

/**
 * Types bundle for CookieFirst source
 */
export type Types = Source.Types<Settings, Mapping, Push, Env, InitSettings>;

/**
 * Config type alias
 */
export type Config = Source.Config<Types>;
