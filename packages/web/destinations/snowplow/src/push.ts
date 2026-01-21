import type { WalkerOS, Logger } from '@walkeros/core';
import type {
  Settings,
  SnowplowFunction,
  SelfDescribingEvent,
  SelfDescribingJson,
  Mapping,
  ContextType,
} from './types';
import type { DestinationWeb } from '@walkeros/web-core';
import { isObject, isArray } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';
import { SCHEMAS } from './types';

/**
 * Map context type to Snowplow schema URI
 */
const CONTEXT_TYPE_TO_SCHEMA: Record<ContextType, keyof typeof SCHEMAS> = {
  product: 'PRODUCT',
  cart: 'CART',
  transaction: 'TRANSACTION',
  refund: 'REFUND',
  checkout_step: 'CHECKOUT_STEP',
  promotion: 'PROMOTION',
  user: 'USER',
};

/**
 * Get schema URI for a context type
 */
function getSchemaForContextType(
  contextType: ContextType,
  settings?: Settings,
): string {
  const schemaKey = CONTEXT_TYPE_TO_SCHEMA[contextType];
  const settingsKey = `${contextType}Schema` as keyof NonNullable<
    Settings['snowplow']
  >;

  // Check for override in settings
  const override = settings?.snowplow?.[settingsKey] as string | undefined;
  if (override) return override;

  // Use default schema
  return SCHEMAS[schemaKey];
}

/**
 * Push event to Snowplow (simple approach like GA4/Meta)
 *
 * The data parameter already contains mapped data from the mapping rules.
 * We just wrap it with Snowplow schemas and send it.
 *
 * @param actionName - Action type from rule.name (e.g., ACTIONS.ADD_TO_CART)
 */
export function pushSnowplowEvent(
  event: WalkerOS.Event,
  mapping: Mapping,
  data: WalkerOS.AnyObject,
  actionName?: string,
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

  // Handle ecommerce events with action type (from rule.name)
  if (actionName) {
    const actionSchema =
      mapping.snowplow?.actionSchema ||
      settings?.snowplow?.actionSchema ||
      SCHEMAS.ACTION;

    // The data already contains the mapped fields
    // We just need to wrap it with the appropriate Snowplow structure
    const selfDescribingEvent: SelfDescribingEvent = {
      event: {
        schema: actionSchema,
        data: {
          type: actionName,
        },
      },
      context: createContexts(data, mapping, settings),
    };

    snowplow('trackSelfDescribingEvent', selfDescribingEvent);
  }

  // Events without action name are silently skipped
}

/**
 * Create Snowplow context array from mapped data
 *
 * Uses explicit contextType from mapping - no auto-detection.
 * The mapping specifies which context entity type to use.
 */
function createContexts(
  data: WalkerOS.AnyObject,
  mapping: Mapping,
  settings?: Settings,
): SelfDescribingJson<WalkerOS.Properties>[] | undefined {
  const contexts: SelfDescribingJson<WalkerOS.Properties>[] = [];

  // Copy data to avoid mutation
  const dataCopy = { ...data };

  // Extract products array (always uses product schema)
  const productsArray = dataCopy.products;
  delete dataCopy.products;

  // Create main context entity if contextType is specified
  if (mapping.contextType && Object.keys(dataCopy).length > 0) {
    const schema = getSchemaForContextType(mapping.contextType, settings);
    contexts.push({
      schema,
      data: dataCopy as WalkerOS.Properties,
    });
  }

  // Handle "products" array (from loop mapping like GA4 items)
  // Products always use the product schema
  if (isArray(productsArray)) {
    const productSchema = settings?.snowplow?.productSchema || SCHEMAS.PRODUCT;

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
