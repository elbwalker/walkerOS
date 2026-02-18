import type { Source, Elb } from '@walkeros/core';

/**
 * Usercentrics consent event detail structure.
 *
 * Fired as event.detail on the configured window event (e.g. 'ucEvent').
 * Contains both category-level (ucCategory) and service-level consent.
 */
export interface UsercentricsEventDetail {
  /** Always 'consent_status' for consent events */
  event: string;
  /** 'explicit' when user actively chose, 'implicit' for page-load defaults (casing may vary) */
  type: string;
  /** Action taken: 'onAcceptAllServices', 'onDenyAllServices', 'onUpdateServices' */
  action?: string;
  /** Category-level consent booleans (e.g. { marketing: true, functional: false }) */
  ucCategory?: Record<string, boolean | unknown>;
  /** Service-level consent as top-level keys (e.g. 'Google Analytics': true) */
  [service: string]: unknown;
}

declare global {
  interface WindowEventMap {
    ucEvent: CustomEvent<UsercentricsEventDetail>;
  }
}

/**
 * Settings for Usercentrics source
 */
export interface Settings {
  /**
   * Window event name to listen for.
   * Configured in Usercentrics admin under Implementation > Data Layer & Events.
   * Can also be set to 'UC_SDK_EVENT' for the built-in Browser SDK event.
   *
   * Default: 'ucEvent'
   */
  eventName?: string;

  /**
   * Map Usercentrics categories to walkerOS consent groups.
   * Keys: Usercentrics category names (from ucCategory)
   * Values: walkerOS consent group names
   *
   * Applied in both group-level and service-level consent modes.
   * When multiple source categories map to the same group, OR logic applies:
   * if ANY source category is true, the target group is true.
   *
   * Default: {} (pass through category names as-is)
   */
  categoryMap?: Record<string, string>;

  /**
   * Only process explicit consent (user made a choice).
   * When true: Ignores events where type !== 'explicit'
   * When false: Processes any consent_status event including implicit/defaults
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
 * Environment interface for Usercentrics source
 */
export interface Env extends Source.BaseEnv {
  window?: Window & typeof globalThis;
}

/**
 * Types bundle for Usercentrics source
 */
export type Types = Source.Types<Settings, Mapping, Push, Env, InitSettings>;

/**
 * Config type alias
 */
export type Config = Source.Config<Types>;
