import type {
  Mapping as WalkerOSMapping,
  WalkerOS,
  Destination as CoreDestination,
  Mapping as CoreMapping,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

// Official Snowplow types
import type {
  SelfDescribingJson,
  CommonEventProperties,
} from '@snowplow/tracker-core';
import type {
  BrowserPlugin,
  ActivityTrackingConfiguration,
} from '@snowplow/browser-tracker-core';
import type {
  Action,
  Product,
  Cart,
  SPTransaction,
  SPPromotion,
  CheckoutStep,
  Refund,
  TransactionError,
  User,
  Page,
} from '@snowplow/browser-plugin-snowplow-ecommerce';

// Re-export official Snowplow entity types
export type {
  SelfDescribingJson,
  CommonEventProperties,
  Action,
  Product,
  Cart,
  SPTransaction,
  SPPromotion,
  CheckoutStep,
  Refund,
  TransactionError,
  User,
  Page,
};

// Re-export Snowplow tracker core types
export type { BrowserPlugin, ActivityTrackingConfiguration };

declare global {
  interface Window {
    snowplow?: SnowplowFunction;
    GlobalSnowplowNamespace?: string;
  }
}

// Snowplow tracker queue function type (similar to gtag or fbq)
export interface SnowplowFunction {
  (...args: unknown[]): void;
  q?: unknown[];
}

/**
 * Complete self-describing event structure
 * This is the full parameter passed to window.snowplow('trackSelfDescribingEvent', ...)
 */
export type SelfDescribingEvent<T = WalkerOS.Properties> = {
  event: SelfDescribingJson<T>;
} & CommonEventProperties<T>;

/**
 * Page context settings for setPageType
 *
 * Each field is resolved via getMappingValue, allowing dynamic values
 * from event data or static values.
 *
 * @example
 * // Dynamic values from globals
 * page: {
 *   type: 'globals.page_type',
 *   language: 'globals.language',
 *   locale: 'globals.locale'
 * }
 *
 * // Mixed static and dynamic
 * page: {
 *   type: 'globals.page_type',
 *   language: { value: 'en' },
 *   locale: { value: 'en-US' }
 * }
 */
export interface PageSettings {
  /** Page type (required) */
  type: CoreMapping.Value;
  /** Page language (optional) */
  language?: CoreMapping.Value;
  /** Page locale (optional) */
  locale?: CoreMapping.Value;
}

/**
 * URL-based plugin configuration (for sp.js JavaScript tracker)
 */
export interface UrlBasedPlugin {
  /** CDN or self-hosted URL to the plugin script */
  url: string;
  /** [globalName, constructorName] for the plugin */
  name: [string, string];
  /** Optional override for enable method (derived by convention if omitted) */
  enableMethod?: string;
  /** Options passed to the enable method */
  options?: Record<string, unknown>;
}

/**
 * Union type for all supported plugin forms
 */
export type SnowplowPlugin = BrowserPlugin | UrlBasedPlugin;

/**
 * Built-in context entity types for tracker initialization
 */
export interface TrackerContexts {
  /** Web page context (default: true) */
  webPage?: boolean;
  /** Client session context - enables client_session schema */
  session?: boolean;
  /** Browser context - device info, viewport, language, etc. */
  browser?: boolean;
  /** Performance timing context */
  performanceTiming?: boolean;
  /** Geolocation context */
  geolocation?: boolean;
}

/**
 * Anonymous tracking configuration
 *
 * When enabled, the tracker will not set any user identifiers (domain_userid, network_userid).
 * This is useful for privacy-focused tracking or when user consent has not been given.
 */
export interface AnonymousTrackingConfig {
  /**
   * Request server-side anonymisation
   *
   * When true, the collector will anonymise the user's IP address
   * and not set the network_userid cookie.
   */
  withServerAnonymisation?: boolean;
  /**
   * Continue session tracking in anonymous mode
   *
   * When true, session context will still be attached to events
   * even when anonymous tracking is enabled.
   */
  withSessionTracking?: boolean;
}

/**
 * Basis for processing under GDPR
 */
export type BasisForProcessing =
  | 'consent'
  | 'contract'
  | 'legal_obligation'
  | 'vital_interests'
  | 'public_task'
  | 'legitimate_interests';

/**
 * Consent tracking configuration
 *
 * Enables consent event tracking via the Snowplow Enhanced Consent plugin.
 * When configured, walkerOS consent events are translated to Snowplow
 * trackConsentAllow/Deny/Selected calls via the `on('consent')` handler.
 *
 * Requires @snowplow/browser-plugin-enhanced-consent to be loaded.
 *
 * @example
 * consent: {
 *   required: ['analytics', 'marketing'],
 *   basisForProcessing: 'consent',
 *   consentUrl: 'https://example.com/privacy',
 *   consentVersion: '2.0',
 *   domainsApplied: ['example.com'],
 *   gdprApplies: true,
 * }
 */
export interface ConsentConfig {
  /**
   * walkerOS consent groups to check
   *
   * If not specified, all consent groups from the event are used.
   * Use this to filter which consent groups are relevant for Snowplow.
   *
   * @example ['analytics', 'marketing']
   */
  required?: string[];

  /**
   * Legal basis for processing under GDPR
   *
   * @default 'consent'
   */
  basisForProcessing?: BasisForProcessing;

  /**
   * URL to the privacy policy or consent document
   */
  consentUrl?: string;

  /**
   * Version of the consent document/policy
   */
  consentVersion?: string;

  /**
   * Domains where this consent applies
   *
   * @example ['example.com', 'shop.example.com']
   */
  domainsApplied?: string[];

  /**
   * Whether GDPR applies to this user/region
   */
  gdprApplies?: boolean;
}

/**
 * walkerOS mapping-based global context
 */
export interface MappedGlobalContext {
  /** Iglu schema URI */
  schema: string;
  /** Data mapping using walkerOS syntax */
  data: WalkerOSMapping.Map;
  /** Discriminator flag */
  __mapped: true;
}

/**
 * Static global context (same for all events)
 */
export interface StaticGlobalContext {
  schema: string;
  data: Record<string, unknown>;
}

/**
 * Dynamic global context generator function
 */
export type GlobalContextGenerator = () => StaticGlobalContext | null;

/**
 * Union type for all global context forms
 */
export type GlobalContext =
  | StaticGlobalContext
  | GlobalContextGenerator
  | MappedGlobalContext;

/**
 * Configuration settings for Snowplow destination
 */
export interface Settings {
  /**
   * Snowplow collector endpoint URL
   *
   * Required. The URL of your Snowplow collector.
   *
   * @example "https://collector.example.com"
   */
  collectorUrl?: string;

  /**
   * Application ID
   *
   * Identifier for your application in Snowplow.
   *
   * @default undefined
   */
  appId?: string;

  /**
   * Tracker instance name
   *
   * Name for the tracker instance. Useful when running multiple trackers.
   *
   * @default "sp"
   */
  trackerName?: string;

  /**
   * Platform identifier
   *
   * Platform the tracker is running on.
   *
   * @default "web"
   */
  platform?: string;

  /**
   * Enable automatic page view tracking
   *
   * If true, page view events will be tracked automatically.
   *
   * @default false
   */
  pageViewTracking?: boolean;

  /**
   * Snowplow-specific ecommerce configuration
   */
  snowplow?: SnowplowSettings;

  /**
   * Global page context (calls setPageType)
   *
   * Each field is resolved via getMappingValue. When the resolved page object
   * changes, setPageType is called to update the global Page context.
   *
   * @example
   * // Dynamic from globals
   * page: {
   *   type: 'globals.page_type',
   *   language: 'globals.language'
   * }
   *
   * // Static values
   * page: {
   *   type: { value: 'product' },
   *   language: { value: 'en' },
   *   locale: { value: 'en-US' }
   * }
   */
  page?: PageSettings;

  /**
   * User ID for Snowplow's cross-session user stitching
   *
   * Called once via setUserId() on the first event where the value resolves.
   * Subsequent events automatically include this user_id.
   *
   * @example
   * // From walkerOS user object (recommended)
   * userId: 'user.id'
   *
   * // From globals
   * userId: 'globals.user_id'
   */
  userId?: CoreMapping.Value;

  /**
   * Discover and set the root domain for cookies
   * @default true
   */
  discoverRootDomain?: boolean;

  /**
   * SameSite attribute for cookies
   * @default undefined (browser default)
   */
  cookieSameSite?: 'Strict' | 'Lax' | 'None';

  /**
   * Application version string
   */
  appVersion?: string;

  /**
   * Built-in context entities to attach to events
   */
  contexts?: TrackerContexts;

  /**
   * Enable anonymous tracking
   *
   * When enabled, the tracker will not set user identifiers.
   * Can be a boolean (true enables basic anonymous tracking) or
   * a configuration object for fine-grained control.
   *
   * @example
   * // Basic anonymous tracking
   * anonymousTracking: true
   *
   * @example
   * // With server-side anonymisation
   * anonymousTracking: {
   *   withServerAnonymisation: true,
   *   withSessionTracking: true
   * }
   */
  anonymousTracking?: boolean | AnonymousTrackingConfig;

  /**
   * Snowplow plugins to load (BrowserPlugin or URL-based)
   */
  plugins?: SnowplowPlugin[];

  /**
   * Activity tracking configuration (page pings)
   */
  activityTracking?: ActivityTrackingConfiguration;

  /**
   * Global context entities attached to all events
   */
  globalContexts?: GlobalContext[];

  /**
   * Consent tracking configuration
   *
   * When configured, enables consent event tracking via the `on('consent')` handler.
   * Requires @snowplow/browser-plugin-enhanced-consent to be loaded.
   *
   * @example
   * consent: {
   *   required: ['analytics', 'marketing'],
   *   basisForProcessing: 'consent',
   *   consentUrl: 'https://example.com/privacy',
   *   consentVersion: '2.0',
   * }
   */
  consent?: ConsentConfig;
}

/**
 * Snowplow-specific settings (similar to GA4Settings in gtag)
 */
export interface SnowplowSettings {
  /**
   * Ecommerce action schema URI
   *
   * Schema used for all ecommerce action events.
   *
   * @default "iglu:com.snowplowanalytics.snowplow.ecommerce/snowplow_ecommerce_action/jsonschema/1-0-2"
   */
  actionSchema?: string;

  /**
   * Product entity schema URI
   *
   * @default "iglu:com.snowplowanalytics.snowplow.ecommerce/product/jsonschema/1-0-0"
   */
  productSchema?: string;

  /**
   * Cart entity schema URI
   *
   * @default "iglu:com.snowplowanalytics.snowplow.ecommerce/cart/jsonschema/1-0-0"
   */
  cartSchema?: string;

  /**
   * Transaction entity schema URI
   *
   * @default "iglu:com.snowplowanalytics.snowplow.ecommerce/transaction/jsonschema/1-0-0"
   */
  transactionSchema?: string;

  /**
   * Refund entity schema URI
   *
   * @default "iglu:com.snowplowanalytics.snowplow.ecommerce/refund/jsonschema/1-0-0"
   */
  refundSchema?: string;

  /**
   * Checkout step entity schema URI
   *
   * @default "iglu:com.snowplowanalytics.snowplow.ecommerce/checkout_step/jsonschema/1-0-0"
   */
  checkoutStepSchema?: string;

  /**
   * Promotion entity schema URI
   *
   * @default "iglu:com.snowplowanalytics.snowplow.ecommerce/promotion/jsonschema/1-0-0"
   */
  promotionSchema?: string;

  /**
   * User entity schema URI (optional)
   *
   * @example "iglu:com.snowplowanalytics.snowplow/client_session/jsonschema/1-0-0"
   */
  userSchema?: string;

  /**
   * Custom entity schemas
   *
   * Define schemas for custom context entities.
   *
   * @example { custom_entity: "iglu:com.example/custom/jsonschema/1-0-0" }
   */
  customSchemas?: {
    [entityType: string]: string;
  };

  /**
   * Default currency code (ISO 4217)
   *
   * Used as fallback when currency is not specified in event data.
   *
   * @example "USD", "EUR", "GBP"
   * @default "USD"
   */
  currency?: string;

  /**
   * Data mapping at destination level
   *
   * Global data transformation applied to all events.
   */
  data?: WalkerOSMapping.Value | WalkerOSMapping.Values;
}

/**
 * Context entity definition for Snowplow
 *
 * Each context entity has a schema URI and data mapping.
 */
export interface ContextEntity {
  /**
   * Iglu schema URI for this context entity
   *
   * @example SCHEMAS.PRODUCT, SCHEMAS.TRANSACTION
   */
  schema: string;

  /**
   * Data mapping for this context entity
   *
   * Uses standard walkerOS mapping syntax.
   *
   * @example { id: 'data.id', name: 'data.name', price: 'data.price' }
   */
  data: WalkerOSMapping.Map;
}

/**
 * Structured event mapping for Snowplow's trackStructEvent
 *
 * When configured, bypasses self-describing events entirely
 * and calls trackStructEvent with the resolved values.
 *
 * @example
 * struct: {
 *   category: { value: 'ui' },
 *   action: { value: 'click' },
 *   label: 'data.button_name',
 *   property: 'data.section',
 *   value: 'data.position',
 * }
 */
export interface StructuredEventMapping {
  /** Event category (required) */
  category: CoreMapping.Value;
  /** Event action (required) */
  action: CoreMapping.Value;
  /** Event label (optional) */
  label?: CoreMapping.Value;
  /** Event property (optional) */
  property?: CoreMapping.Value;
  /** Event value - must resolve to a number (optional) */
  value?: CoreMapping.Value;
}

/**
 * Custom mapping parameters for Snowplow events
 *
 * Uses standard `name` field for action type.
 * The `name` from the mapping rule becomes Snowplow's event.data.type.
 */
export interface Mapping {
  /**
   * Context entities to attach to this event
   *
   * Each entry defines a schema and data mapping.
   * Explicit - no auto-detection.
   *
   * @example
   * context: [
   *   { schema: SCHEMAS.PRODUCT, data: { id: 'data.id', name: 'data.name' } }
   * ]
   */
  context?: ContextEntity[];

  /**
   * Snowplow-specific settings override
   */
  snowplow?: SnowplowMappingSettings;

  /**
   * Structured event mapping (bypasses self-describing events)
   *
   * When configured, calls trackStructEvent instead of trackSelfDescribingEvent.
   * No schema is used - this completely bypasses the self-describing event path.
   *
   * @example
   * struct: {
   *   category: { value: 'ui' },
   *   action: { value: 'click' },
   *   label: 'data.button_name',
   * }
   */
  struct?: StructuredEventMapping;
}

/**
 * Per-event Snowplow settings override
 */
export interface SnowplowMappingSettings {
  /**
   * Override action schema for this specific event
   */
  actionSchema?: string;
}

/**
 * Environment dependencies for Snowplow destination
 */
export interface Env extends DestinationWeb.Env {
  window: {
    snowplow?: SnowplowFunction;
  };
}

export type Types = CoreDestination.Types<Settings, Mapping, Env>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
export type Param = WalkerOSMapping.Value;

/**
 * Snowplow Ecommerce Schema URIs
 * Based on Snowplow Analytics official ecommerce schema
 */
export const SCHEMAS = {
  ACTION:
    'iglu:com.snowplowanalytics.snowplow.ecommerce/snowplow_ecommerce_action/jsonschema/1-0-2',
  PRODUCT:
    'iglu:com.snowplowanalytics.snowplow.ecommerce/product/jsonschema/1-0-0',
  CART: 'iglu:com.snowplowanalytics.snowplow.ecommerce/cart/jsonschema/1-0-0',
  TRANSACTION:
    'iglu:com.snowplowanalytics.snowplow.ecommerce/transaction/jsonschema/1-0-0',
  REFUND:
    'iglu:com.snowplowanalytics.snowplow.ecommerce/refund/jsonschema/1-0-0',
  CHECKOUT_STEP:
    'iglu:com.snowplowanalytics.snowplow.ecommerce/checkout_step/jsonschema/1-0-0',
  PROMOTION:
    'iglu:com.snowplowanalytics.snowplow.ecommerce/promotion/jsonschema/1-0-0',
  PAGE: 'iglu:com.snowplowanalytics.snowplow.ecommerce/page/jsonschema/1-0-0',
  USER: 'iglu:com.snowplowanalytics.snowplow.ecommerce/user/jsonschema/1-0-0',
} as const;

/**
 * Snowplow ecommerce action types
 * Type-safe values matching official Action['type']
 */
export const ACTIONS: Record<string, Action['type']> = {
  PRODUCT_VIEW: 'product_view',
  LIST_VIEW: 'list_view',
  LIST_CLICK: 'list_click',
  ADD_TO_CART: 'add_to_cart',
  REMOVE_FROM_CART: 'remove_from_cart',
  CHECKOUT_STEP: 'checkout_step',
  TRANSACTION: 'transaction',
  REFUND: 'refund',
  PROMO_VIEW: 'promo_view',
  PROMO_CLICK: 'promo_click',
  TRANSACTION_ERROR: 'trns_error',
} as const;

/**
 * Snowplow Web Schema URIs
 * Events and contexts for web analytics tracking
 */
export const WEB_SCHEMAS = {
  // Events
  LINK_CLICK: 'iglu:com.snowplowanalytics.snowplow/link_click/jsonschema/1-0-1',
  CHANGE_FORM:
    'iglu:com.snowplowanalytics.snowplow/change_form/jsonschema/1-0-0',
  FOCUS_FORM: 'iglu:com.snowplowanalytics.snowplow/focus_form/jsonschema/1-0-0',
  SUBMIT_FORM:
    'iglu:com.snowplowanalytics.snowplow/submit_form/jsonschema/1-0-0',
  SITE_SEARCH:
    'iglu:com.snowplowanalytics.snowplow/site_search/jsonschema/1-0-0',
  SOCIAL:
    'iglu:com.snowplowanalytics.snowplow/social_interaction/jsonschema/1-0-0',
  TIMING: 'iglu:com.snowplowanalytics.snowplow/timing/jsonschema/1-0-0',
  WEB_VITALS: 'iglu:com.snowplowanalytics.snowplow/web_vitals/jsonschema/1-0-0',
  // Contexts
  WEB_PAGE: 'iglu:com.snowplowanalytics.snowplow/web_page/jsonschema/1-0-0',
  BROWSER:
    'iglu:com.snowplowanalytics.snowplow/browser_context/jsonschema/2-0-0',
  CLIENT_SESSION:
    'iglu:com.snowplowanalytics.snowplow/client_session/jsonschema/1-0-2',
  GEOLOCATION:
    'iglu:com.snowplowanalytics.snowplow/geolocation_context/jsonschema/1-1-0',
} as const;

/**
 * Snowplow Consent Schema URIs
 * For Enhanced Consent plugin events and contexts
 */
export const CONSENT_SCHEMAS = {
  // Events (fired by Enhanced Consent plugin)
  PREFERENCES:
    'iglu:com.snowplowanalytics.snowplow/consent_preferences/jsonschema/1-0-0',
  CMP_VISIBLE:
    'iglu:com.snowplowanalytics.snowplow/cmp_visible/jsonschema/1-0-0',
  // Contexts
  DOCUMENT:
    'iglu:com.snowplowanalytics.snowplow/consent_document/jsonschema/1-0-0',
  GDPR: 'iglu:com.snowplowanalytics.snowplow/gdpr/jsonschema/1-0-0',
} as const;

/**
 * Snowplow Media Schema URIs
 * Events and contexts for media (video/audio) tracking
 *
 * Requires @snowplow/browser-plugin-media-tracking for automatic tracking
 * or can be used manually with trackSelfDescribingEvent
 *
 * @see https://docs.snowplow.io/docs/collecting-data/collecting-from-own-applications/javascript-trackers/web-tracker/tracking-events/media/
 */
export const MEDIA_SCHEMAS = {
  // Core playback events
  PLAY: 'iglu:com.snowplowanalytics.snowplow.media/play_event/jsonschema/1-0-0',
  PAUSE:
    'iglu:com.snowplowanalytics.snowplow.media/pause_event/jsonschema/1-0-0',
  END: 'iglu:com.snowplowanalytics.snowplow.media/end_event/jsonschema/1-0-0',
  READY:
    'iglu:com.snowplowanalytics.snowplow.media/ready_event/jsonschema/1-0-0',

  // Seek events
  SEEK_START:
    'iglu:com.snowplowanalytics.snowplow.media/seek_start_event/jsonschema/1-0-0',
  SEEK_END:
    'iglu:com.snowplowanalytics.snowplow.media/seek_end_event/jsonschema/1-0-0',

  // Buffer events
  BUFFER_START:
    'iglu:com.snowplowanalytics.snowplow.media/buffer_start_event/jsonschema/1-0-0',
  BUFFER_END:
    'iglu:com.snowplowanalytics.snowplow.media/buffer_end_event/jsonschema/1-0-0',

  // Player state change events
  QUALITY_CHANGE:
    'iglu:com.snowplowanalytics.snowplow.media/quality_change_event/jsonschema/1-0-0',
  FULLSCREEN_CHANGE:
    'iglu:com.snowplowanalytics.snowplow.media/fullscreen_change_event/jsonschema/1-0-0',
  VOLUME_CHANGE:
    'iglu:com.snowplowanalytics.snowplow.media/volume_change_event/jsonschema/1-0-0',
  PLAYBACK_RATE_CHANGE:
    'iglu:com.snowplowanalytics.snowplow.media/playback_rate_change_event/jsonschema/1-0-0',
  PIP_CHANGE:
    'iglu:com.snowplowanalytics.snowplow.media/picture_in_picture_change_event/jsonschema/1-0-0',

  // Progress events
  PING: 'iglu:com.snowplowanalytics.snowplow.media/ping_event/jsonschema/1-0-0',
  PERCENT_PROGRESS:
    'iglu:com.snowplowanalytics.snowplow.media/percent_progress_event/jsonschema/1-0-0',

  // Error event
  ERROR:
    'iglu:com.snowplowanalytics.snowplow.media/error_event/jsonschema/1-0-0',

  // Ad events
  AD_BREAK_START:
    'iglu:com.snowplowanalytics.snowplow.media/ad_break_start_event/jsonschema/1-0-0',
  AD_BREAK_END:
    'iglu:com.snowplowanalytics.snowplow.media/ad_break_end_event/jsonschema/1-0-0',
  AD_START:
    'iglu:com.snowplowanalytics.snowplow.media/ad_start_event/jsonschema/1-0-0',
  AD_COMPLETE:
    'iglu:com.snowplowanalytics.snowplow.media/ad_complete_event/jsonschema/1-0-0',
  AD_SKIP:
    'iglu:com.snowplowanalytics.snowplow.media/ad_skip_event/jsonschema/1-0-0',
  AD_CLICK:
    'iglu:com.snowplowanalytics.snowplow.media/ad_click_event/jsonschema/1-0-0',
  AD_PAUSE:
    'iglu:com.snowplowanalytics.snowplow.media/ad_pause_event/jsonschema/1-0-0',
  AD_RESUME:
    'iglu:com.snowplowanalytics.snowplow.media/ad_resume_event/jsonschema/1-0-0',
  AD_QUARTILE:
    'iglu:com.snowplowanalytics.snowplow.media/ad_quartile_event/jsonschema/1-0-0',

  // Contexts (attached to media events)
  MEDIA_PLAYER:
    'iglu:com.snowplowanalytics.snowplow/media_player/jsonschema/1-0-0',
  SESSION: 'iglu:com.snowplowanalytics.snowplow.media/session/jsonschema/1-0-0',
  AD: 'iglu:com.snowplowanalytics.snowplow.media/ad/jsonschema/1-0-0',
  AD_BREAK:
    'iglu:com.snowplowanalytics.snowplow.media/ad_break/jsonschema/1-0-0',
} as const;

/**
 * Media action types for event mapping
 * Use with mapping.name to specify the action type
 */
export const MEDIA_ACTIONS = {
  PLAY: 'play',
  PAUSE: 'pause',
  END: 'end',
  READY: 'ready',
  SEEK_START: 'seek_start',
  SEEK_END: 'seek_end',
  BUFFER_START: 'buffer_start',
  BUFFER_END: 'buffer_end',
  QUALITY_CHANGE: 'quality_change',
  FULLSCREEN_CHANGE: 'fullscreen_change',
  VOLUME_CHANGE: 'volume_change',
  PLAYBACK_RATE_CHANGE: 'playback_rate_change',
  PIP_CHANGE: 'pip_change',
  PING: 'ping',
  PERCENT_PROGRESS: 'percent_progress',
  ERROR: 'error',
  AD_BREAK_START: 'ad_break_start',
  AD_BREAK_END: 'ad_break_end',
  AD_START: 'ad_start',
  AD_COMPLETE: 'ad_complete',
  AD_SKIP: 'ad_skip',
  AD_CLICK: 'ad_click',
  AD_PAUSE: 'ad_pause',
  AD_RESUME: 'ad_resume',
  AD_QUARTILE: 'ad_quartile',
} as const;

/**
 * Type guard for URL-based plugins
 */
export function isUrlBasedPlugin(
  plugin: SnowplowPlugin,
): plugin is UrlBasedPlugin {
  return typeof plugin === 'object' && 'url' in plugin && 'name' in plugin;
}

/**
 * Type guard for mapped global contexts
 */
export function isMappedGlobalContext(
  ctx: GlobalContext,
): ctx is MappedGlobalContext {
  return typeof ctx === 'object' && ctx !== null && '__mapped' in ctx;
}

/**
 * Derive enable method from plugin constructor name
 * 'LinkClickTrackingPlugin' -> 'enableLinkClickTracking'
 */
export function deriveEnableMethod(constructorName: string): string {
  return 'enable' + constructorName.replace('Plugin', '');
}
