import type { Source, Elb } from '@walkeros/core';

/**
 * OneTrust global API interface.
 *
 * Represents the subset of the OneTrust SDK we interact with.
 * The full SDK is much larger, but we only need consent-related methods.
 */
export interface OneTrustAPI {
  /** Returns true if user has made an explicit consent choice */
  IsAlertBoxClosed: () => boolean;
  /** Register a callback for consent changes (callback receives event with detail: string[]) */
  OnConsentChanged?: (fn: (event: { detail: string[] }) => void) => void;
}

declare global {
  interface Window {
    /** OneTrust SDK global object */
    OneTrust?: OneTrustAPI;
    /** Comma-separated string of active consent category IDs (e.g. ",C0001,C0003,") */
    OptanonActiveGroups?: string;
    /** OneTrust callback function, called on SDK load and consent changes */
    OptanonWrapper?: () => void;
    /** CookiePro legacy alias for OneTrust */
    Optanon?: unknown;
    [key: string]: OneTrustAPI | unknown;
  }

  interface WindowEventMap {
    /** event.detail is an array of active group ID strings (e.g. ["C0001", "C0002"]) */
    OneTrustGroupsUpdated: CustomEvent<string[]>;
  }
}

/**
 * Settings for CookiePro/OneTrust source
 */
export interface Settings {
  /**
   * Map CookiePro category IDs to walkerOS consent groups.
   * Keys: CookiePro category IDs (e.g. 'C0001', 'C0002')
   * Values: walkerOS consent group names
   *
   * Comparison is case-insensitive (keys are normalized to lowercase during init).
   *
   * Default provides sensible mapping for standard OneTrust categories:
   * - C0001 (Strictly Necessary) -> functional
   * - C0002 (Performance) -> analytics
   * - C0003 (Functional) -> functional
   * - C0004 (Targeting) -> marketing
   * - C0005 (Social Media) -> marketing
   */
  categoryMap?: Record<string, string>;

  /**
   * Only process explicit consent (user made a choice).
   * When true: Checks OneTrust.IsAlertBoxClosed() -- only processes
   * consent if user has actively interacted with the banner.
   * When false: Processes any consent state including defaults.
   *
   * Default: true
   */
  explicitOnly?: boolean;

  /**
   * Custom name for window.OneTrust object.
   * Some implementations use a different global name.
   *
   * Default: 'OneTrust'
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
 * Environment interface for CookiePro source
 */
export interface Env extends Source.BaseEnv {
  window?: Window & typeof globalThis;
}

/**
 * Types bundle for CookiePro source
 */
export type Types = Source.Types<Settings, Mapping, Push, Env, InitSettings>;

/**
 * Config type alias
 */
export type Config = Source.Config<Types>;
