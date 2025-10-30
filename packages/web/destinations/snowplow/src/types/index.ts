import type {
  Mapping as WalkerOSMapping,
  WalkerOS,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

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

// Snowplow self-describing event structure
export interface SelfDescribingEvent {
  event: {
    schema: string;
    data: WalkerOS.Properties;
  };
  context?: ContextEntity[];
}

// Snowplow context entity (wrapped with schema)
export interface ContextEntity {
  schema: string;
  data: WalkerOS.Properties;
}

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
 * Custom mapping parameters for Snowplow events
 *
 * Similar to GA4/Meta pattern - keeps mapping flat and simple.
 */
export interface Mapping {
  /**
   * Snowplow ecommerce action type
   *
   * Determines which Snowplow ecommerce action this event maps to.
   *
   * @example "product_view", "add_to_cart", "transaction", "refund"
   */
  action?: string;

  /**
   * Snowplow-specific settings override
   *
   * Allows per-event schema and configuration overrides.
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

  /**
   * Override entity schemas for this specific event
   */
  schemas?: {
    product?: string;
    cart?: string;
    transaction?: string;
    refund?: string;
    checkout_step?: string;
    promotion?: string;
    user?: string;
    [entityType: string]: string | undefined;
  };

  /**
   * Data mapping at event level
   */
  data?: WalkerOSMapping.Value | WalkerOSMapping.Values;
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
 * Default Snowplow Ecommerce Schema URIs
 * Based on Snowplow Analytics official ecommerce schema
 */
export const DEFAULT_SCHEMAS = {
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
  USER: 'iglu:com.snowplowanalytics.snowplow/client_session/jsonschema/1-0-0',
} as const;

/**
 * Snowplow ecommerce action types
 */
export const ACTION_TYPES = {
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
 * Field name mappings for context entity detection
 * Maps field names to their respective entity types
 */
export const ENTITY_FIELD_MAPPING = {
  product: [
    'id',
    'name',
    'category',
    'price',
    'currency',
    'quantity',
    'variant',
    'brand',
    'size',
    'list_price',
    'inventory_status',
    'position',
    'creative_id',
  ],
  transaction: [
    'transaction_id',
    'revenue',
    'payment_method',
    'total_quantity',
    'tax',
    'shipping',
    'discount_code',
    'discount_amount',
    'credit_order',
  ],
  cart: ['cart_id', 'total_value'],
  refund: ['transaction_id', 'refund_amount', 'refund_reason', 'refund_method'],
  checkout_step: [
    'step',
    'shipping_postcode',
    'billing_postcode',
    'shipping_full_address',
    'billing_full_address',
    'delivery_provider',
    'delivery_method',
    'coupon_code',
    'account_type',
    'payment_method',
    'proof_of_payment',
    'marketing_opt_in',
  ],
  promotion: ['id', 'name', 'creative_id', 'type', 'position', 'slot'],
} as const;

/**
 * Required fields per entity type
 * Based on Snowplow ecommerce schema requirements
 */
export const REQUIRED_FIELDS = {
  product: ['id', 'category', 'price', 'currency'],
  transaction: [
    'transaction_id',
    'revenue',
    'payment_method',
    'currency',
    'total_quantity',
  ],
  cart: ['total_value', 'currency'],
  refund: ['transaction_id', 'refund_amount', 'currency'],
  checkout_step: ['step'],
  promotion: ['id'],
} as const;
