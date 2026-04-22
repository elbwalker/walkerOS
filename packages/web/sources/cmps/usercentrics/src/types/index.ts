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
    UC_UI_CMP_EVENT: CustomEvent<UsercentricsV3CmpEventDetail>;
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

/**
 * Usercentrics V3 category state. The SDK may add future states; we handle
 * unknowns conservatively as non-accepting.
 */
export type UsercentricsV3CategoryState =
  | 'ALL_ACCEPTED'
  | 'ALL_DENIED'
  | 'SOME_ACCEPTED'
  | 'NO_STATE'
  | string;

/**
 * Minimal V3 CategoryData — only fields the adapter reads.
 */
export interface UsercentricsV3CategoryData {
  state: UsercentricsV3CategoryState;
  name: string;
}

/**
 * Minimal V3 ConsentData — only the `type` field is used to distinguish
 * explicit vs implicit consent. Other fields (status, version, etc.) exist on
 * the real SDK but are not read by this adapter.
 */
export interface UsercentricsV3ConsentData {
  type: 'EXPLICIT' | 'IMPLICIT' | string;
}

/**
 * Minimal V3 ConsentDetails — only the fields the adapter reads.
 * The real SDK also exposes `services`, but the adapter currently operates
 * at category level only.
 */
export interface UsercentricsV3ConsentDetails {
  consent: UsercentricsV3ConsentData;
  categories: Record<string, UsercentricsV3CategoryData>;
}

/**
 * Usercentrics V3 window API (`window.__ucCmp`).
 *
 * Only the methods this adapter calls are typed — the real SDK surface is
 * much wider but we intentionally keep this narrow.
 */
export interface UsercentricsV3Api {
  isInitialized: () => Promise<boolean>;
  getConsentDetails: () => Promise<UsercentricsV3ConsentDetails>;
}

/**
 * V3 CMP event detail. Fired on `UC_UI_CMP_EVENT` (or custom name).
 * `source: 'CMP'` + a decision `type` tells us a user action has been taken.
 */
export interface UsercentricsV3CmpEventDetail {
  source?: string;
  type?: string;
}

declare global {
  interface Window {
    /**
     * Usercentrics V2 CMP API. Attached once the V2 Browser SDK is
     * initialized. Optional because the SDK loads asynchronously — guard
     * with a truthiness check before access.
     */
    UC_UI?: UsercentricsV2Api;
    /**
     * Usercentrics V3 CMP API. Attached once the V3 Browser SDK is
     * initialized. Optional because the SDK loads asynchronously — guard
     * with a truthiness check before access.
     */
    __ucCmp?: UsercentricsV3Api;
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
   * When multiple source categories map to the same group, strict AND logic
   * applies: ALL contributing source categories must be true for the target
   * group to be true. Any single false denies consent.
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
