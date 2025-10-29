import type { Mapping, WalkerOS, Collector } from './types';
import { getByPath, setByPath } from './byPath';
import { isArray, isDefined, isString, isObject } from './is';
import { castToProperty } from './property';
import { tryCatchAsync } from './tryCatch';
import { getGrantedConsent } from './consent';
import { assign } from './assign';

/**
 * Gets the mapping for an event.
 *
 * @param event The event to get the mapping for (can be partial or full).
 * @param mapping The mapping rules.
 * @returns The mapping result.
 */
export async function getMappingEvent(
  event: WalkerOS.DeepPartialEvent | WalkerOS.PartialEvent | WalkerOS.Event,
  mapping?: Mapping.Rules,
): Promise<Mapping.Result> {
  const [entity, action] = (event.name || '').split(' ');
  if (!mapping || !entity || !action) return {};

  let eventMapping: Mapping.Rule | undefined;
  let mappingKey = '';
  let entityKey = entity;
  let actionKey = action;

  const resolveEventMapping = (
    eventMapping?: Mapping.Rule | Mapping.Rule[],
  ) => {
    if (!eventMapping) return;
    eventMapping = isArray(eventMapping) ? eventMapping : [eventMapping];

    return eventMapping.find(
      (eventMapping) =>
        !eventMapping.condition || eventMapping.condition(event),
    );
  };

  if (!mapping[entityKey]) entityKey = '*';
  const entityMapping = mapping[entityKey];

  if (entityMapping) {
    if (!entityMapping[actionKey]) actionKey = '*';
    eventMapping = resolveEventMapping(entityMapping[actionKey]);
  }

  // Fallback to * *
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
  options: Mapping.Options = {},
): Promise<WalkerOS.Property | undefined> {
  if (!isDefined(value)) return;

  // Get consent state in priority order: value.consent > options.consent > collector?.consent
  const consentState =
    ((isObject(value) && value.consent) as WalkerOS.Consent) ||
    options.consent ||
    options.collector?.consent;

  const mappings = isArray(data) ? data : [data];

  for (const mapping of mappings) {
    const result = await tryCatchAsync(processMappingValue)(value, mapping, {
      ...options,
      consent: consentState,
    });
    if (isDefined(result)) return result;
  }

  return;
}

async function processMappingValue(
  value: WalkerOS.DeepPartialEvent | unknown,
  mapping: Mapping.Value,
  options: Mapping.Options = {},
): Promise<WalkerOS.Property | undefined> {
  const { collector, consent: consentState } = options;

  // Ensure mapping is an array for uniform processing
  const mappings = isArray(mapping) ? mapping : [mapping];

  // Loop over each mapping and return the first valid result
  return mappings.reduce(
    async (accPromise, mappingItem) => {
      const acc = await accPromise;
      if (acc) return acc; // A valid result was already found

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

      // Check if this mapping should be used
      if (
        condition &&
        !(await tryCatchAsync(condition)(value, mappingItem, collector))
      )
        return;

      // Check if consent is required and granted
      if (consent && !getGrantedConsent(consent, consentState))
        return staticValue;

      let mappingValue: unknown = isDefined(staticValue) ? staticValue : value;

      // Use a custom function to get the value
      if (fn) {
        mappingValue = await tryCatchAsync(fn)(value, mappingItem, options);
      }

      // Get dynamic value from the event
      if (key) {
        mappingValue = getByPath(value, key, staticValue);
      }

      if (loop) {
        const [scope, itemMapping] = loop;

        const data =
          scope === 'this'
            ? [value]
            : await getMappingValue(value, scope, options);

        if (isArray(data)) {
          mappingValue = (
            await Promise.all(
              data.map((item) => getMappingValue(item, itemMapping, options)),
            )
          ).filter(isDefined);
        }
      } else if (map) {
        mappingValue = await Object.entries(map).reduce(
          async (mappedObjPromise, [mapKey, mapValue]) => {
            const mappedObj = await mappedObjPromise;
            const result = await getMappingValue(value, mapValue, options);
            if (isDefined(result)) mappedObj[mapKey] = result;
            return mappedObj;
          },
          Promise.resolve({} as WalkerOS.AnyObject),
        );
      } else if (set) {
        mappingValue = await Promise.all(
          set.map((item) => processMappingValue(value, item, options)),
        );
      }

      // Validate the value
      if (validate && !(await tryCatchAsync(validate)(mappingValue)))
        mappingValue = undefined;

      const property = castToProperty(mappingValue);

      // Finally, check and convert the type
      return isDefined(property) ? property : castToProperty(staticValue); // Always use value as a fallback
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
}> {
  // Step 1: Apply config-level policy (modifies event)
  if (config.policy) {
    await Promise.all(
      Object.entries(config.policy).map(async ([key, mapping]) => {
        const value = await getMappingValue(event, mapping, { collector });
        event = setByPath(event, key, value);
      }),
    );
  }

  // Step 2: Get event mapping rule
  const { eventMapping, mappingKey } = await getMappingEvent(
    event,
    config.mapping,
  );

  // Step 2.5: Apply event-level policy (modifies event)
  if (eventMapping?.policy) {
    await Promise.all(
      Object.entries(eventMapping.policy).map(async ([key, mapping]) => {
        const value = await getMappingValue(event, mapping, { collector });
        event = setByPath(event, key, value);
      }),
    );
  }

  // Step 3: Transform global data
  let data =
    config.data && (await getMappingValue(event, config.data, { collector }));

  if (eventMapping) {
    // Check if event should be ignored
    if (eventMapping.ignore) {
      return { event, data, mapping: eventMapping, mappingKey, ignore: true };
    }

    // Override event name if specified
    if (eventMapping.name) event.name = eventMapping.name;

    // Transform event-specific data
    if (eventMapping.data) {
      const dataEvent =
        eventMapping.data &&
        (await getMappingValue(event, eventMapping.data, { collector }));
      data =
        isObject(data) && isObject(dataEvent) // Only merge objects
          ? assign(data, dataEvent)
          : dataEvent;
    }
  }

  return { event, data, mapping: eventMapping, mappingKey, ignore: false };
}
