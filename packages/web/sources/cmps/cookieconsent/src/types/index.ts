import type { Source, Elb } from '@walkeros/core';

declare module '@walkeros/core' {
  interface SourceMap {
    cookieconsent: { type: 'cookieconsent'; platform?: 'web' };
  }
}

/**
 * The subset of `CookieConsent.getUserPreferences()` the source reads.
 *
 * After a valid choice every configured category is in one of the two lists,
 * read-only ones always accepted. Before it `rejectedCategories` is empty,
 * and `acceptedCategories` is empty in opt-in mode or holds the read-only and
 * enabled categories in opt-out mode, which is no decision.
 */
export interface UserPreferences {
  /** `'all'`, `'custom'` or `'necessary'`. */
  acceptType?: string;
  acceptedCategories: string[];
  rejectedCategories: string[];
}

/**
 * The subset of the CookieConsent API (`window.CookieConsent`) the source
 * reads.
 */
export interface CookieConsentAPI {
  /**
   * False while the visitor has not decided, after a revision change, or
   * when the consent cookie is missing, expired or invalid.
   */
  validConsent(): boolean;
  getUserPreferences(): UserPreferences;
}

/**
 * Window surface the source touches: the CookieConsent global and event
 * registration. Narrowed instead of the global `Window`, so the package adds
 * no global declarations that could clash with the library's own types, and
 * test mocks satisfy it without a cast.
 */
export interface CookieConsentWindow {
  CookieConsent?: CookieConsentAPI;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

/**
 * Settings for the CookieConsent source
 */
export interface Settings {
  /**
   * Map CookieConsent categories to walkerOS consent groups.
   * Keys: the category names of the site's CookieConsent config
   * Values: walkerOS consent group names
   *
   * Comparison is case-insensitive. Categories without an entry pass through
   * under their own name, `necessary` and `analytics` among them by default.
   *
   * Default:
   * - ads -> marketing
   */
  categoryMap?: Record<string, string>;
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
 * Environment interface for the CookieConsent source
 */
export interface Env extends Source.BaseEnv {
  window?: CookieConsentWindow;
}

/**
 * Types bundle for the CookieConsent source
 */
export type Types = Source.Types<Settings, Mapping, Push, Env, InitSettings>;

/**
 * Config type alias
 */
export type Config = Source.Config<Types>;
