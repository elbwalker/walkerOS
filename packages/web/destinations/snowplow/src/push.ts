import type { WalkerOS, Logger } from '@walkeros/core';
import type {
  Settings,
  SnowplowFunction,
  SelfDescribingEvent,
  SelfDescribingJson,
  Mapping,
} from './types';
import type { DestinationWeb } from '@walkeros/web-core';
import { isObject, isArray, getMappingValue, isString } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';
import { SCHEMAS } from './types';

// State object for multiple global contexts
interface GlobalContextState {
  page?: string; // JSON stringified for object comparison
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
