import type { WalkerOS, Logger, Mapping as MappingTypes } from '@walkeros/core';
import type {
  SnowplowFunction,
  SelfDescribingEvent,
  SelfDescribingJson,
  Mapping,
  StructuredEventMapping,
  Config,
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

/**
 * Check if context data definition contains a loop
 *
 * Loop format: { loop: [scope, itemMapping] }
 */
function isLoopContextData(
  data: unknown,
): data is { loop: [unknown, unknown] } {
  return (
    isObject(data) &&
    'loop' in data &&
    isArray((data as Record<string, unknown>).loop) &&
    ((data as Record<string, unknown>).loop as unknown[]).length === 2
  );
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
  config?: Config,
  env?: DestinationWeb.Env,
  logger?: Logger.Instance,
): Promise<void> {
  const { window } = getEnv(env);
  const snowplow = window.snowplow as SnowplowFunction;

  if (!snowplow) {
    logger?.throw('Tracker not initialized');
    return;
  }

  const settings = config?.settings;
  const runtimeState = settings?._state;

  // Set userId once on first event where value is available
  if (settings?.userId && !runtimeState?.userIdSet) {
    const userId = await getMappingValue(event, settings.userId);
    if (userId && isString(userId)) {
      snowplow('setUserId', userId);
      if (runtimeState) runtimeState.userIdSet = true;
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

      if (pageKey !== runtimeState?.page) {
        if (runtimeState) runtimeState.page = pageKey;
        snowplow('setPageType', pageObj);
      }
    }
  }

  // Handle structured events (bypasses self-describing events)
  if (mapping.struct) {
    await handleStructuredEvent(event, mapping.struct, snowplow, logger);
    return;
  }

  // Handle page view events (only when explicitly configured)
  if (settings?.pageViewEvent && event.name === settings.pageViewEvent) {
    snowplow('trackPageView');
    return;
  }

  // Handle self-describing events
  if (actionName) {
    const actionSchema =
      mapping.snowplow?.actionSchema ||
      settings?.snowplow?.actionSchema ||
      SCHEMAS.ACTION;

    const context = await buildContext(event, mapping);

    // Build event data based on schema type
    let eventData: WalkerOS.AnyObject = {};

    if (mapping.data?.map) {
      // Use mapped data for self-describing events (e.g., percent_progress)
      const mapped = await getMappingValue(event, mapping.data);
      if (isObject(mapped)) eventData = mapped as WalkerOS.AnyObject;
    } else if (actionSchema === SCHEMAS.ACTION) {
      // Ecommerce pattern: include type field
      eventData = { type: actionName };
    }
    // else: empty data {} for marker events (media play/pause/etc.)

    snowplow('trackSelfDescribingEvent', {
      event: { schema: actionSchema, data: eventData },
      context: context.length > 0 ? context : undefined,
    });
  } else {
    logger?.info('Event skipped: no action name in mapping', {
      event: event.name,
      hasContext: !!mapping.context?.length,
    });
  }
}

/**
 * Build Snowplow context array from mapping.context definitions
 *
 * Applies data mappings to each context entity.
 * Supports loop expansion: when contextDef.data contains a loop definition,
 * creates multiple context entities (one per array item).
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

    // Check if this is a loop expansion
    if (isLoopContextData(contextDef.data)) {
      const [scope, itemMapping] = contextDef.data.loop;

      // Get the source array using getMappingValue with the scope
      const sourceArray = await getMappingValue(event, scope as string);

      if (isArray(sourceArray)) {
        // Apply the item mapping to each element and create a context entity for each
        for (const item of sourceArray) {
          const mappedData = await getMappingValue(
            item,
            itemMapping as MappingTypes.Data,
          );

          if (isObject(mappedData)) {
            contexts.push({
              schema: contextDef.schema,
              data: mappedData as WalkerOS.Properties,
            });
          }
        }
      }
    } else {
      // Original behavior: single context entity
      const mappedData = await getMappingValue(event, { map: contextDef.data });

      if (isObject(mappedData)) {
        contexts.push({
          schema: contextDef.schema,
          data: mappedData as WalkerOS.Properties,
        });
      }
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
  logger?: Logger.Instance,
): Promise<void> {
  // Resolve required fields
  const category = await getMappingValue(event, struct.category);
  const action = await getMappingValue(event, struct.action);

  // Category and action are required - skip with warning if not present
  if (!category || !isString(category)) {
    logger?.info('Struct event skipped: invalid category', {
      event: event.name,
      category,
      reason: !category ? 'missing' : 'not a string',
    });
    return;
  }
  if (!action || !isString(action)) {
    logger?.info('Struct event skipped: invalid action', {
      event: event.name,
      action,
      reason: !action ? 'missing' : 'not a string',
    });
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
