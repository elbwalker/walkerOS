import type { Mapping, WalkerOS, Collector } from './types';
import { deleteByPath, setByPath } from './byPath';
import { isArray, isDefined, isObject, isThenable } from './is';
import { assign } from './assign';
import { flattenIncludeSections } from './include';
import { resolveMappingValue } from './mappingValue';
import { FatalError } from './fatalError';

/**
 * Gets the mapping for an event.
 *
 * @param event The event to get the mapping for (can be partial or full).
 * @param mapping The mapping rules.
 * @param collector Required to evaluate rule-level conditions against the unified Context. Legacy callers may omit; rule-level conditions then run without a context and a throw propagates (defensive).
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

  // A condition that throws or rejects: logged and no match. A FatalError,
  // and any throw without a collector (nothing to log to), propagates.
  const onConditionError = (err: unknown, key: string): false => {
    if (err instanceof FatalError || !collector) throw err;
    collector.logger.error('mapping rule condition failed', {
      event,
      mappingKey: key,
      error: err,
    });
    return false;
  };

  // Synchronous unless the condition returns a promise.
  const matchesRule = (
    rule: Mapping.Rule,
    key: string,
  ): boolean | Promise<boolean> => {
    const { condition } = rule;
    if (!condition) return true;
    let result: WalkerOS.PromiseOrValue<boolean>;
    try {
      // Without a collector there is no Context: the condition runs without
      // one. Internal callers always pass a collector (defensive branch).
      result = collector
        ? condition(event, {
            event,
            mapping: rule,
            collector,
            logger: collector.logger,
            consent: ((isObject(event) &&
              (event as WalkerOS.PartialEvent).consent) ||
              collector.consent) as WalkerOS.Consent,
          })
        : condition(event, undefined as never);
    } catch (err) {
      return onConditionError(err, key);
    }
    // Promise.resolve adopts a foreign thenable, so a `then` that throws
    // still reaches the handler; a native promise passes through as is.
    return isThenable(result)
      ? Promise.resolve(result).then(Boolean, (err: unknown) =>
          onConditionError(err, key),
        )
      : Boolean(result);
  };

  // Rules are tried in order and the first match wins. Resolution stays
  // synchronous until a condition returns a promise; from there the rest of
  // the list is awaited in order.
  const resolveEventMapping = (
    key: string,
    rules?: Mapping.Rule | Mapping.Rule[],
    start = 0,
  ): Mapping.Rule | undefined | Promise<Mapping.Rule | undefined> => {
    if (!rules) return;
    const list = isArray(rules) ? rules : [rules];
    for (let index = start; index < list.length; index++) {
      const rule = list[index];
      const matched = matchesRule(rule, key);
      if (typeof matched !== 'boolean')
        return resolvePending(matched, rule, key, list, index);
      if (matched) return rule;
    }
    return;
  };

  const resolvePending = async (
    pending: Promise<boolean>,
    rule: Mapping.Rule,
    key: string,
    list: Mapping.Rule[],
    index: number,
  ): Promise<Mapping.Rule | undefined> =>
    (await pending) ? rule : resolveEventMapping(key, list, index + 1);

  if (!mapping[entityKey]) entityKey = '*';
  const entityMapping = mapping[entityKey];

  if (entityMapping) {
    if (!entityMapping[actionKey]) actionKey = '*';
    const found = resolveEventMapping(
      `${entityKey} ${actionKey}`,
      entityMapping[actionKey],
    );
    // Only an async condition costs an await. A thenable check, not
    // `instanceof Promise`: pages may replace the global Promise.
    eventMapping = isThenable(found) ? await found : found;
  }

  // The * * fallback, unless the lookup above already tried exactly those
  // rules (each condition runs once).
  if (
    !eventMapping &&
    !(entityMapping && entityKey === '*' && actionKey === '*')
  ) {
    entityKey = '*';
    actionKey = '*';
    const found = resolveEventMapping('* *', mapping[entityKey]?.[actionKey]);
    eventMapping = isThenable(found) ? await found : found;
  }

  if (eventMapping) mappingKey = `${entityKey} ${actionKey}`;

  return { eventMapping, mappingKey };
}

/**
 * Gets a value from a mapping.
 *
 * @param value The source to resolve the mapping against, usually an event.
 * @param data The mapping data: a key path, a value config, or a list of them.
 * @param context The collector (required), plus an optional event and consent.
 * @returns The mapped value, or undefined when the value is undefined.
 */
export async function getMappingValue(
  value: WalkerOS.DeepPartialEvent | unknown | undefined,
  data: Mapping.Data = {},
  context: Mapping.ValueContext,
): Promise<WalkerOS.Property | undefined> {
  if (!isDefined(value)) return;

  // The type requires context and collector. The optional chaining lets an
  // untyped caller without them reach the guard in resolveMappingValue.
  // Resolve consent in priority order: value.consent > context.consent > collector.consent
  const consent =
    ((isObject(value) && value.consent) as WalkerOS.Consent) ||
    context?.consent ||
    context?.collector?.consent;

  // Resolve event: explicit context.event wins; else infer from value when it is an event-shaped object.
  const event = (context?.event ??
    (isObject(value) ? value : {})) as WalkerOS.DeepPartialEvent;

  return resolveMappingValue(value, data, { ...context, consent, event });
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

  // Output layer: strip removed paths from the produced data. Applied last,
  // after include, so remove always wins. Rooted at the produced payload.
  if (eventMapping?.remove && isObject(data)) {
    for (const path of eventMapping.remove) {
      data = deleteByPath(data, path);
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
