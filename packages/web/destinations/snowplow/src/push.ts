import type { WalkerOS, Logger } from '@walkeros/core';
import type {
  Settings,
  SnowplowFunction,
  SelfDescribingEvent,
  Mapping,
} from './types';
import type { DestinationWeb } from '@walkeros/web-core';
import { isObject, isArray } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';
import { DEFAULT_SCHEMAS } from './types';

/**
 * Push event to Snowplow (simple approach like GA4/Meta)
 *
 * The data parameter already contains mapped data from the mapping rules.
 * We just wrap it with Snowplow schemas and send it.
 */
export function pushSnowplowEvent(
  event: WalkerOS.Event,
  mapping: Mapping,
  data: WalkerOS.AnyObject,
  settings?: Settings,
  env?: DestinationWeb.Env,
  logger?: Logger.Instance,
): void {
  const { window } = getEnv(env);
  const snowplow = window.snowplow as SnowplowFunction;

  if (!snowplow) {
    logger?.throw('Tracker not initialized');
    return;
  }

  // If no mapping is configured, data might be undefined/empty - skip silently
  if (!isObject(data) || Object.keys(data).length === 0) {
    return;
  }

  // Handle page view events
  if (event.name === 'page view') {
    snowplow('trackPageView');
    return;
  }

  // Handle ecommerce events with action type
  if (mapping.action) {
    const actionSchema =
      mapping.snowplow?.actionSchema ||
      settings?.snowplow?.actionSchema ||
      DEFAULT_SCHEMAS.ACTION;

    // The data already contains the mapped fields
    // We just need to wrap it with the appropriate Snowplow structure
    const selfDescribingEvent: SelfDescribingEvent = {
      event: {
        schema: actionSchema,
        data: {
          type: mapping.action,
        },
      },
      context: createContexts(data, settings),
    };

    snowplow('trackSelfDescribingEvent', selfDescribingEvent);
  }

  // Events without action mapping are silently skipped
}

/**
 * Create Snowplow context array from mapped data
 * The mapping already did the work - we just wrap with schemas
 */
function createContexts(
  data: WalkerOS.AnyObject,
  settings?: Settings,
): SelfDescribingEvent['context'] {
  const contexts: NonNullable<SelfDescribingEvent['context']> = [];

  // Copy data to avoid mutation
  const dataCopy = { ...data };

  // If there's main entity data (not in products array), process it first
  // This ensures transaction/cart/etc appears before products in context array
  const productsArray = dataCopy.products;
  delete dataCopy.products; // Remove temporarily

  if (Object.keys(dataCopy).length > 0) {
    const schema = detectSchema(dataCopy, settings);
    if (schema) {
      contexts.push({
        schema,
        data: dataCopy as WalkerOS.Properties,
      });
    }
  }

  // Handle "products" array (from loop mapping like GA4 items)
  if (isArray(productsArray)) {
    const productSchema =
      settings?.snowplow?.productSchema || DEFAULT_SCHEMAS.PRODUCT;

    for (const product of productsArray) {
      if (isObject(product)) {
        contexts.push({
          schema: productSchema,
          data: product as WalkerOS.Properties,
        });
      }
    }
  }

  return contexts.length > 0 ? contexts : undefined;
}

/**
 * Detect which Snowplow schema to use based on field names
 * Simple heuristic based on key fields
 */
function detectSchema(
  data: WalkerOS.AnyObject,
  settings?: Settings,
): string | undefined {
  const fields = Object.keys(data);

  // Transaction: has transaction_id and revenue
  if (fields.includes('transaction_id') && fields.includes('revenue')) {
    return settings?.snowplow?.transactionSchema || DEFAULT_SCHEMAS.TRANSACTION;
  }

  // Refund: has refund_amount
  if (fields.includes('refund_amount')) {
    return settings?.snowplow?.refundSchema || DEFAULT_SCHEMAS.REFUND;
  }

  // Checkout step: has step
  if (fields.includes('step')) {
    return (
      settings?.snowplow?.checkoutStepSchema || DEFAULT_SCHEMAS.CHECKOUT_STEP
    );
  }

  // Cart: has total_value or cart_currency
  if (fields.includes('total_value') || fields.includes('cart_currency')) {
    return settings?.snowplow?.cartSchema || DEFAULT_SCHEMAS.CART;
  }

  // Promotion: has creative_id or slot
  if (fields.includes('creative_id') || fields.includes('slot')) {
    return settings?.snowplow?.promotionSchema || DEFAULT_SCHEMAS.PROMOTION;
  }

  // Product: has id, name, price, category (most common case)
  if (
    fields.includes('id') &&
    (fields.includes('price') || fields.includes('category'))
  ) {
    return settings?.snowplow?.productSchema || DEFAULT_SCHEMAS.PRODUCT;
  }

  // Default to product if we have an id
  if (fields.includes('id')) {
    return settings?.snowplow?.productSchema || DEFAULT_SCHEMAS.PRODUCT;
  }

  return undefined;
}
