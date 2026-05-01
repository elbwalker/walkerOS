import type { Mapping, WalkerOS, Collector } from './types';
import { getByPath, setByPath } from './byPath';
import { isArray, isDefined, isString, isObject } from './is';
import { castToProperty } from './property';
import { tryCatchAsync } from './tryCatch';
import { getGrantedConsent } from './consent';
import { assign } from './assign';
import { flattenIncludeSections } from './include';

/**
 * Gets the mapping for an event.
 *
 * @param event The event to get the mapping for (can be partial or full).
 * @param mapping The mapping rules.
 * @param collector Required to evaluate rule-level conditions against the unified Context. Legacy callers may omit; rule-level conditions then run with `undefined as never` (defensive).
 * @returns The mapping result.
 */
export async function getMappingEvent(
  event: WalkerOS.DeepPartialEvent | WalkerOS.PartialEvent | WalkerOS.Event,
  mapping?: Mapping.Rules,
  collector?: Collector.Instance,
): Promise<Mapping.Result> {
  const [entity, action] = (event.name || '').split(' ');
  if (!mapping || !entity || !action) return {};

  let eventMapping: Mapping.Rule | undefined;
  let mappingKey = '';
  let entityKey = entity;
  let actionKey = action;

  const resolveEventMapping = (
    rules?: Mapping.Rule | Mapping.Rule[],
  ): Mapping.Rule | undefined => {
    if (!rules) return;
    const list = isArray(rules) ? rules : [rules];
    return list.find((rule) => {
      if (!rule.condition) return true;
      if (!collector) {
        // Rule-level condition without a collector cannot be evaluated against
        // the unified Context. Treat as match (legacy behavior) — internal
        // callers should always pass collector; this branch is defensive.
        return Boolean(rule.condition(event, undefined as never));
      }
      const ctx: Mapping.Context = {
        event,
        mapping: rule,
        collector,
        logger: collector.logger,
        consent: ((isObject(event) &&
          (event as WalkerOS.PartialEvent).consent) ||
          collector.consent) as WalkerOS.Consent,
      };
      return Boolean(rule.condition(event, ctx));
    });
  };

  if (!mapping[entityKey]) entityKey = '*';
  const entityMapping = mapping[entityKey];

  if (entityMapping) {
    if (!entityMapping[actionKey]) actionKey = '*';
    eventMapping = resolveEventMapping(entityMapping[actionKey]);
  }

  if (!eventMapping) {
    entityKey = '*';
    actionKey = '*';
    eventMapping = resolveEventMapping(mapping[entityKey]?.[actionKey]);
  }

  if (eventMapping) mappingKey = `${entityKey} ${actionKey}`;

  return { eventMapping, mappingKey };
}

/**
 * Gets a value from a mapping.
 *
 * @param value The value to get the mapping from.
 * @param data The mapping data.
 * @param options The mapping options.
 * @returns The mapped value.
 */
export async function getMappingValue(
  value: WalkerOS.DeepPartialEvent | unknown | undefined,
  data: Mapping.Data = {},
  context: Partial<Mapping.Context> = {},
): Promise<WalkerOS.Property | undefined> {
  if (!isDefined(value)) return;

  // Resolve consent in priority order: value.consent > context.consent > collector.consent
  const consent =
    ((isObject(value) && value.consent) as WalkerOS.Consent) ||
    context.consent ||
    context.collector?.consent;

  // Resolve event: explicit context.event wins; else infer from value when it is an event-shaped object.
  const event = (context.event ??
    (isObject(value) ? value : {})) as WalkerOS.DeepPartialEvent;

  if (!context.collector) {
    // Internal sites (cache.ts, top-level callers) MUST pass a collector.
    // This guard catches plumbing bugs early instead of silent type-narrowing.
    throw new Error('getMappingValue: context.collector is required');
  }

  const baseContext: Mapping.Context = {
    event,
    mapping: data as Mapping.Value,
    collector: context.collector,
    logger: context.collector.logger,
    consent,
  };

  const mappings = isArray(data) ? data : [data];
  for (const mapping of mappings) {
    const result = await tryCatchAsync(processMappingValue)(value, mapping, {
      ...baseContext,
      mapping,
    });
    if (isDefined(result)) return result;
  }
  return;
}

async function processMappingValue(
  value: WalkerOS.DeepPartialEvent | unknown,
  mapping: Mapping.Value,
  context: Mapping.Context,
): Promise<WalkerOS.Property | undefined> {
  const mappings = isArray(mapping) ? mapping : [mapping];

  return mappings.reduce(
    async (accPromise, mappingItem) => {
      const acc = await accPromise;
      if (acc) return acc;

      const mapping = isString(mappingItem)
        ? { key: mappingItem }
        : mappingItem;

      if (!Object.keys(mapping).length) return;

      const {
        condition,
        consent,
        fn,
        key,
        loop,
        map,
        set,
        validate,
        value: staticValue,
      } = mapping;

      // Per-mapping context — `mapping` reflects the current item.
      const cbContext: Mapping.Context = { ...context, mapping: mappingItem };

      if (condition && !(await tryCatchAsync(condition)(value, cbContext)))
        return;

      if (consent && !getGrantedConsent(consent, cbContext.consent))
        return staticValue;

      let mappingValue: unknown = isDefined(staticValue) ? staticValue : value;

      if (fn) {
        mappingValue = await tryCatchAsync(fn)(value, cbContext);
      }

      if (key) {
        mappingValue = getByPath(value, key, staticValue);
      }

      if (loop) {
        const [scope, itemMapping] = loop;
        const data =
          scope === 'this'
            ? [value]
            : await getMappingValue(value, scope, cbContext);

        if (isArray(data)) {
          mappingValue = (
            await Promise.all(
              data.map((item) => getMappingValue(item, itemMapping, cbContext)),
            )
          ).filter(isDefined);
        }
      } else if (map) {
        mappingValue = await Object.entries(map).reduce(
          async (mappedObjPromise, [mapKey, mapValue]) => {
            const mappedObj = await mappedObjPromise;
            const result = await getMappingValue(value, mapValue, cbContext);
            if (isDefined(result)) mappedObj[mapKey] = result;
            return mappedObj;
          },
          Promise.resolve({} as WalkerOS.AnyObject),
        );
      } else if (set) {
        mappingValue = await Promise.all(
          set.map((item) => processMappingValue(value, item, cbContext)),
        );
      }

      if (validate && !(await tryCatchAsync(validate)(mappingValue, cbContext)))
        mappingValue = undefined;

      const property = castToProperty(mappingValue);
      return isDefined(property) ? property : castToProperty(staticValue);
    },
    Promise.resolve(undefined as WalkerOS.Property | undefined),
  );
}

/**
 * Processes an event through mapping configuration.
 *
 * This is the unified mapping logic used by both sources and destinations.
 * It applies transformations in this order:
 * 1. Config-level policy - modifies the event itself (global rules)
 * 2. Mapping rules - finds matching rule based on entity-action
 * 3. Event-level policy - modifies the event based on specific mapping rule
 * 4. Data transformation - creates context data
 * 5. Ignore check and name override
 *
 * Sources can pass partial events, destinations pass full events.
 * getMappingValue works with both partial and full events.
 *
 * @param event - The event to process (can be partial or full, will be mutated by policies)
 * @param config - Mapping configuration (mapping, data, policy, consent)
 * @param collector - Collector instance for context
 * @returns Object with transformed event, data, mapping rule, and ignore flag
 */
export async function processEventMapping<
  T extends WalkerOS.DeepPartialEvent | WalkerOS.Event,
>(
  event: T,
  config: Mapping.Config,
  collector: Collector.Instance,
): Promise<{
  event: T;
  data?: WalkerOS.Property;
  mapping?: Mapping.Rule;
  mappingKey?: string;
  ignore: boolean;
  silent: boolean;
}> {
  // Step 1: Apply config-level policy (modifies event)
  if (config.policy) {
    await Promise.all(
      Object.entries(config.policy).map(async ([key, mapping]) => {
        const value = await getMappingValue(event, mapping, {
          collector,
          event,
        });
        event = setByPath(event, key, value);
      }),
    );
  }

  // Step 2: Get event mapping rule
  const { eventMapping, mappingKey } = await getMappingEvent(
    event,
    config.mapping,
    collector,
  );

  // Step 2.5: Apply event-level policy (modifies event)
  if (eventMapping?.policy) {
    await Promise.all(
      Object.entries(eventMapping.policy).map(async ([key, mapping]) => {
        const value = await getMappingValue(event, mapping, {
          collector,
          event,
        });
        event = setByPath(event, key, value);
      }),
    );
  }

  // Step 3: Transform global data
  let data =
    config.data &&
    (await getMappingValue(event, config.data, { collector, event }));

  const silent = Boolean(eventMapping?.silent);

  if (eventMapping) {
    // Check if event should be ignored
    if (eventMapping.ignore) {
      return {
        event,
        data,
        mapping: eventMapping,
        mappingKey,
        ignore: true,
        silent,
      };
    }

    // Override event name if specified
    if (eventMapping.name) event.name = eventMapping.name;

    // Transform event-specific data
    if (eventMapping.data) {
      const dataEvent =
        eventMapping.data &&
        (await getMappingValue(event, eventMapping.data, {
          collector,
          event,
        }));
      data =
        isObject(data) && isObject(dataEvent) // Only merge objects
          ? assign(data, dataEvent)
          : dataEvent;
    }
  }

  // Include: flatten event sections into data. Rule-level replaces config-level.
  const effectiveInclude = eventMapping?.include ?? config.include;
  if (effectiveInclude && effectiveInclude.length > 0) {
    const includeData = flattenIncludeSections(event, effectiveInclude);
    if (Object.keys(includeData).length > 0) {
      // Include is the bottom layer - data wins on key conflict.
      data = isObject(data)
        ? (assign(
            includeData,
            data as Record<string, unknown>,
          ) as unknown as WalkerOS.Property)
        : (data ?? (includeData as unknown as WalkerOS.Property));
    }
  }

  return {
    event,
    data,
    mapping: eventMapping,
    mappingKey,
    ignore: false,
    silent,
  };
}
