import type { WalkerOS, Logger } from '@walkeros/core';
import type {
  Settings,
  SnowplowFunction,
  SelfDescribingEvent,
  SelfDescribingJson,
  Mapping,
  StructuredEventMapping,
} from './types';
import type { DestinationWeb } from '@walkeros/web-core';
import {
  isObject,
  isArray,
  getMappingValue,
  isString,
  isNumber,
} from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';
import { SCHEMAS } from './types';

// State object for multiple global contexts
interface GlobalContextState {
  page?: string; // JSON stringified for object comparison
  userIdSet?: boolean; // Track if setUserId has been called
}

let state: GlobalContextState = {};

/**
 * Reset all global context state (for testing)
 */
export function resetState(): void {
  state = {};
}

/**
 * Push event to Snowplow
 *
 * Processes mapping.context to build Snowplow context entities.
 * Each context entry has a schema and data mapping that is applied to the event.
 *
 * @param actionName - Action type from rule.name (e.g., ACTIONS.ADD_TO_CART)
 */
export async function pushSnowplowEvent(
  event: WalkerOS.Event,
  mapping: Mapping,
  data: WalkerOS.AnyObject,
  actionName?: string,
  settings?: Settings,
  env?: DestinationWeb.Env,
  logger?: Logger.Instance,
): Promise<void> {
  const { window } = getEnv(env);
  const snowplow = window.snowplow as SnowplowFunction;

  if (!snowplow) {
    logger?.throw('Tracker not initialized');
    return;
  }

  // Set userId once on first event where value is available
  if (settings?.userId && !state.userIdSet) {
    const userId = await getMappingValue(event, settings.userId);
    if (userId && isString(userId)) {
      snowplow('setUserId', userId);
      state.userIdSet = true;
    }
  }

  // Handle setPageType if configured
  if (settings?.page) {
    // Resolve each field via getMappingValue
    const type = await getMappingValue(event, settings.page.type);
    const language = settings.page.language
      ? await getMappingValue(event, settings.page.language)
      : undefined;
    const locale = settings.page.locale
      ? await getMappingValue(event, settings.page.locale)
      : undefined;

    if (type && isString(type)) {
      const pageObj = {
        type,
        ...(language && isString(language) && { language }),
        ...(locale && isString(locale) && { locale }),
      };
      const pageKey = JSON.stringify(pageObj);

      if (pageKey !== state.page) {
        state.page = pageKey;
        snowplow('setPageType', pageObj);
      }
    }
  }

  // Handle structured events (bypasses self-describing events)
  if (mapping.struct) {
    await handleStructuredEvent(event, mapping.struct, snowplow);
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

    // Build context from mapping.context definitions
    const context = await buildContext(event, mapping);

    const selfDescribingEvent: SelfDescribingEvent = {
      event: {
        schema: actionSchema,
        data: {
          type: actionName,
        },
      },
      context: context.length > 0 ? context : undefined,
    };

    snowplow('trackSelfDescribingEvent', selfDescribingEvent);
  }

  // Events without action name are silently skipped
}

/**
 * Build Snowplow context array from mapping.context definitions
 *
 * Applies data mappings to each context entity.
 */
async function buildContext(
  event: WalkerOS.Event,
  mapping: Mapping,
): Promise<SelfDescribingJson<WalkerOS.Properties>[]> {
  const contexts: SelfDescribingJson<WalkerOS.Properties>[] = [];

  if (!isArray(mapping.context)) {
    return contexts;
  }

  for (const contextDef of mapping.context) {
    if (!isObject(contextDef) || !contextDef.schema) {
      continue;
    }

    // Apply data mapping to get context entity data
    const mappedData = await getMappingValue(event, { map: contextDef.data });

    if (isObject(mappedData)) {
      contexts.push({
        schema: contextDef.schema,
        data: mappedData as WalkerOS.Properties,
      });
    }
  }

  return contexts;
}

/**
 * Handle structured events via trackStructEvent
 *
 * Bypasses self-describing events entirely. Resolves mapping values
 * and calls Snowplow's trackStructEvent with category, action, label,
 * property, and value.
 */
async function handleStructuredEvent(
  event: WalkerOS.Event,
  struct: StructuredEventMapping,
  snowplow: SnowplowFunction,
): Promise<void> {
  // Resolve required fields
  const category = await getMappingValue(event, struct.category);
  const action = await getMappingValue(event, struct.action);

  // Category and action are required - silently skip if not present
  if (!category || !isString(category)) {
    return;
  }
  if (!action || !isString(action)) {
    return;
  }

  // Resolve optional fields
  const label = struct.label
    ? await getMappingValue(event, struct.label)
    : undefined;
  const property = struct.property
    ? await getMappingValue(event, struct.property)
    : undefined;
  const rawValue = struct.value
    ? await getMappingValue(event, struct.value)
    : undefined;

  // Convert value to number if present
  const value = rawValue !== undefined ? Number(rawValue) : undefined;

  snowplow('trackStructEvent', {
    category,
    action,
    ...(label && isString(label) && { label }),
    ...(property && isString(property) && { property }),
    ...(value !== undefined && isNumber(value) && !isNaN(value) && { value }),
  });
}
