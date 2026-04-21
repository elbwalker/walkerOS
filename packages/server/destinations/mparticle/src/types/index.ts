import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';

/**
 * mParticle data pod. Determines the regional endpoint used for the Events
 * API. Defaults to `us1`. See {@link buildEndpoint} in `batch.ts`.
 */
export type Pod = 'us1' | 'us2' | 'eu1' | 'au1';

/**
 * mParticle environment for the batch. `production` routes to production
 * data streams; `development` sends to debug/verify streams.
 */
export type Environment = 'production' | 'development';

/**
 * Event type used for the outgoing mParticle event. Defaults to
 * `custom_event` when not explicitly mapped via rule settings.
 */
export type EventType = 'custom_event' | 'screen_view' | 'commerce_event';

/**
 * mParticle custom event type (category) for `custom_event`s. Defaults to
 * `other` when not specified.
 */
export type CustomEventType =
  | 'navigation'
  | 'location'
  | 'search'
  | 'transaction'
  | 'user_content'
  | 'user_preference'
  | 'social'
  | 'media'
  | 'attribution'
  | 'other';

/**
 * mParticle product action verbs for commerce events.
 */
export type ProductActionType =
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'checkout'
  | 'checkout_option'
  | 'click'
  | 'view_detail'
  | 'purchase'
  | 'refund'
  | 'add_to_wishlist'
  | 'remove_from_wishlist';

export interface Settings {
  /** mParticle input feed API key. */
  apiKey: string;
  /** mParticle input feed API secret. */
  apiSecret: string;
  /** Data pod selecting the regional endpoint. Default: `us1`. */
  pod?: Pod;
  /** Environment the batch targets. Default: `production`. */
  environment?: Environment;
  /**
   * Mapping that resolves to `user_identities` per batch. Each entry value
   * is a walkerOS mapping value; the resolved object is placed into the
   * mParticle batch `user_identities` envelope.
   */
  userIdentities?: WalkerOSMapping.Map;
  /**
   * Mapping that resolves to `user_attributes` per batch.
   */
  userAttributes?: WalkerOSMapping.Value;
  /**
   * Optional static consent state passthrough — shape is forwarded verbatim
   * to `consent_state` on the batch.
   */
  consent?: ConsentState;
  /** walkerOS mapping value resolving to the client IP for the batch. */
  ip?: WalkerOSMapping.Value;
  /**
   * Optional request correlation id. When omitted, falls back to `event.id`.
   */
  sourceRequestId?: WalkerOSMapping.Value;
}

export type InitSettings = Partial<Settings>;

/**
 * Per-rule mapping settings. Determines which mParticle event shape is
 * produced for this walkerOS event and allows per-event identity overrides.
 */
export interface Mapping {
  /** Event type. Default: `custom_event`. */
  eventType?: EventType;
  /** Custom event type category for `custom_event`. Default: `other`. */
  customEventType?: CustomEventType;
  /** Commerce mapping resolving to ProductAction and related fields. */
  commerce?: WalkerOSMapping.Value;
  /** Per-event override for `user_identities`. Merged over settings. */
  userIdentities?: WalkerOSMapping.Map;
  /** Per-event override for `user_attributes`. */
  userAttributes?: WalkerOSMapping.Value;
}

export interface Env extends DestinationServer.Env {
  sendServer?: typeof sendServer;
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export interface Destination extends DestinationServer.Destination<Types> {
  init: DestinationServer.InitFn<Types>;
}

export type Config = {
  settings: Settings;
} & DestinationServer.Config<Types>;

export type InitFn = DestinationServer.InitFn<Types>;
export type PushFn = DestinationServer.PushFn<Types>;
export type PartialConfig = DestinationServer.PartialConfig<Types>;
export type PushEvents = DestinationServer.PushEvents<Mapping>;
export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;

/**
 * Top-level mParticle batch payload posted to
 * `https://s2s.{pod}.mparticle.com/v2/events`.
 * https://docs.mparticle.com/developers/server/http/
 */
export interface MParticleBatch {
  events: MParticleEvent[];
  user_identities?: Record<string, string | number>;
  user_attributes?: Record<string, unknown>;
  environment: Environment;
  schema_version?: number;
  ip?: string;
  source_request_id?: string;
  consent_state?: ConsentState;
  context?: Record<string, unknown>;
}

export type MParticleEvent =
  | { event_type: 'custom_event'; data: CustomEventData }
  | { event_type: 'screen_view'; data: ScreenViewEventData }
  | { event_type: 'commerce_event'; data: CommerceEventData };

export interface CommonEventData {
  timestamp_unixtime_ms?: number;
  source_message_id?: string;
  session_uuid?: string;
  custom_attributes?: Record<string, unknown>;
  custom_flags?: Record<string, unknown>;
  location?: Record<string, unknown>;
}

export interface CustomEventData extends CommonEventData {
  event_name: string;
  custom_event_type: CustomEventType;
}

export interface ScreenViewEventData extends CommonEventData {
  screen_name?: string;
}

export interface CommerceEventData extends CommonEventData {
  product_action?: ProductAction;
  promotion_action?: PromotionAction;
  product_impressions?: ProductImpression[];
  currency_code?: string;
  is_non_interactive?: boolean;
}

export interface ProductAction {
  action: ProductActionType;
  transaction_id?: string;
  total_amount?: number;
  tax_amount?: number;
  shipping_amount?: number;
  coupon_code?: string;
  affiliation?: string;
  checkout_step?: number;
  checkout_options?: string;
  products?: Product[];
}

export interface Product {
  id?: string;
  name?: string;
  brand?: string;
  category?: string;
  variant?: string;
  position?: number;
  price?: number;
  quantity?: number;
  coupon_code?: string;
  total_product_amount?: number;
  custom_attributes?: Record<string, unknown>;
}

export interface PromotionAction {
  action: 'view' | 'click';
  promotions?: Array<{
    id?: string;
    name?: string;
    creative?: string;
    position?: string;
  }>;
}

export interface ProductImpression {
  product_impression_list?: string;
  products?: Product[];
}

/**
 * mParticle consent state envelope forwarded verbatim on the batch.
 * https://docs.mparticle.com/developers/server/http/#consent-state
 */
export interface ConsentState {
  gdpr?: Record<string, GDPRConsentState>;
  ccpa?: { data_sale_opt_out?: CCPAConsentState };
}

export interface GDPRConsentState {
  consented: boolean;
  document?: string;
  timestamp_unixtime_ms?: number;
  location?: string;
  hardware_id?: string;
}

export interface CCPAConsentState {
  consented: boolean;
  document?: string;
  timestamp_unixtime_ms?: number;
  location?: string;
  hardware_id?: string;
}
