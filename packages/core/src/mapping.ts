import type { Mapping, WalkerOS } from './types';
import { getGrantedConsent } from './consent';
import { getByPath } from './byPath';
import { isArray, isDefined, isString, isObject } from './is';
import { castToProperty } from './property';
import { tryCatchAsync } from './tryCatch';

export async function getMappingEvent(
  event: WalkerOS.PartialEvent,
  mapping?: Mapping.Rules,
): Promise<Mapping.Result> {
  const [entity, action] = (event.event || '').split(' ');
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

      if (fn) {
        // Use a custom function to get the value
        mappingValue = await tryCatchAsync(fn)(value, mappingItem, options);
      }

      if (key) {
        // Get dynamic value from the event
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
