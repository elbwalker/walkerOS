import type {
  Mapping as WalkerOSMapping,
  WalkerOS,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

// Official Snowplow types
import type {
  SelfDescribingJson,
  CommonEventProperties,
} from '@snowplow/tracker-core';
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
