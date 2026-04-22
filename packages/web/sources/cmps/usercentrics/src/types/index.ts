import type { Source, Elb } from '@walkeros/core';
import type { Usercentrics } from 'usercentrics-browser-ui';

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
 * Usercentrics V2 service info shape returned by `UC_UI.getServicesBaseInfo()`.
 * Only the fields we use are typed — minimal surface, not a full V2 API mirror.
 */
export interface UsercentricsV2Service {
  /** Category slug: 'essential' | 'functional' | 'marketing' | custom */
  categorySlug: string;
  /** Consent state for this service */
  consent: {
    status: boolean;
  };
}

/**
 * Usercentrics V2 window API (`window.UC_UI`).
 *
 * Methods are synchronous (unlike V3). All methods are optional because
 * Usercentrics does not guarantee every deployment exposes every method.
 */
export interface UsercentricsV2Api {
  isInitialized?: () => boolean;
  getServicesBaseInfo?: () => UsercentricsV2Service[];
  areAllConsentsAccepted?: () => boolean;
}

declare global {
  interface Window {
    UC_UI?: UsercentricsV2Api;
    /**
     * Usercentrics V3 CMP API. Attached once the V3 Browser SDK is
     * initialized. The `@types/usercentrics-browser-ui` package declares this
     * as always-present; our adapter still guards with a truthiness check for
     * early-page / SSR safety.
     */
    __ucCmp: Usercentrics;
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

  /**
   * Which Usercentrics API to target.
   * - 'auto' (default): detect at init. If `window.__ucCmp` is present, use V3.
   *   If only `window.UC_UI` is present, use V2. If neither is present yet,
   *   register listeners for both so late-loading CMPs are still caught.
   * - 'v2': force legacy `window.UC_UI` path.
   * - 'v3': force current `window.__ucCmp` path.
   */
  apiVersion?: 'auto' | 'v2' | 'v3';

  /**
   * V3 window event name to listen for consent changes.
   *
   * Usercentrics V3 hardcodes its built-in event names (`UC_UI_CMP_EVENT`,
   * `UC_UI_INITIALIZED`, `UC_UI_VIEW_CHANGED`, `UC_CONSENT`) — they cannot be
   * renamed. However, the Usercentrics admin dashboard (Implementation >
   * Data Layer & Events) lets admins configure an ADDITIONAL custom window
   * event. Use this setting to point at that custom event name if
   * configured; otherwise leave as default.
   *
   * Default: 'UC_UI_CMP_EVENT'
   */
  v3EventName?: string;
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
