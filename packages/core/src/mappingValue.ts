import type { Mapping, WalkerOS } from './types';
import { getByPath } from './byPath';
import { isArray, isDefined, isString } from './is';
import { castToProperty } from './property';
import { tryCatchAsync } from './tryCatch';
import { FatalError } from './fatalError';
import { getGrantedConsent } from './consent';

// Package-internal value resolution shared by `mapping.ts` and `state.ts`.
// Not re-exported from the package index: `getMappingValue` is the public
// entry point.

/**
 * Like getMappingValue, but also runs for an undefined source and takes
 * consent and event only from the context.
 *
 * @param value The source to resolve the mapping against.
 * @param data The mapping data: a key path, a value config, or a list of them.
 * @param context The collector (required), plus an optional event and consent.
 * @returns The mapped value.
 */
export async function resolveMappingValue(
  value: unknown,
  data: Mapping.Data = {},
  context: Mapping.ValueContext,
): Promise<WalkerOS.Property | undefined> {
  if (!context.collector) {
    // The type requires a collector. This guard protects untyped callers
    // (JavaScript, or getMappingValue called without one) with a clear error.
    throw new Error('getMappingValue: context.collector is required');
  }

  const consent = context.consent || context.collector.consent;
  const event = context.event ?? {};

  const baseContext: Mapping.Context = {
    event,
    mapping: data as Mapping.Value,
    collector: context.collector,
    logger: context.collector.logger,
    consent,
  };

  const mappings = isArray(data) ? data : [data];
  for (const mapping of mappings) {
    const result = await tryCatchAsync(
      processMappingValue,
      (err: unknown): undefined => {
        if (err instanceof FatalError) throw err;
        context.collector.status.failed++;
        baseContext.logger.error('mapping processing failed', {
          event,
          error: err,
        });
        return undefined;
      },
    )(value, mapping, {
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

      if (
        condition &&
        !(await tryCatchAsync(condition, (err: unknown): boolean => {
          if (err instanceof FatalError) throw err;
          cbContext.logger.error('mapping condition failed', {
            event: cbContext.event,
            error: err,
          });
          return false; // Preserve "skip this rule" semantic on throw.
        })(value, cbContext))
      )
        return;

      if (consent && !getGrantedConsent(consent, cbContext.consent))
        return staticValue;

      let mappingValue: unknown = isDefined(staticValue) ? staticValue : value;

      // One producer per value, in this order; the rest never run. A producer
      // that yields nothing leaves the result to the `value` fallback.
      if (loop) {
        const [scope, itemMapping] = loop;
        const data =
          scope === 'this'
            ? [value]
            : await resolveMappingValue(value, scope, cbContext);

        // Each item is mapped with the parent's consent: a `consent` key on
        // the item is plain data and never grants anything. Undefined items
        // stay filtered out.
        mappingValue = isArray(data)
          ? (
              await Promise.all(
                data.map((item) =>
                  isDefined(item)
                    ? resolveMappingValue(item, itemMapping, cbContext)
                    : undefined,
                ),
              )
            ).filter(isDefined)
          : undefined;
      } else if (map) {
        mappingValue = await Object.entries(map).reduce(
          async (mappedObjPromise, [mapKey, mapValue]) => {
            const mappedObj = await mappedObjPromise;
            const result = await resolveMappingValue(
              value,
              mapValue,
              cbContext,
            );
            if (isDefined(result)) mappedObj[mapKey] = result;
            return mappedObj;
          },
          Promise.resolve({} as WalkerOS.AnyObject),
        );
      } else if (set) {
        mappingValue = await Promise.all(
          set.map((item) => processMappingValue(value, item, cbContext)),
        );
      } else if (key) {
        mappingValue = getByPath(value, key, staticValue);
      } else if (fn) {
        mappingValue = await tryCatchAsync(fn, (err: unknown): undefined => {
          if (err instanceof FatalError) throw err;
          cbContext.logger.error('mapping fn failed', {
            event: cbContext.event,
            error: err,
          });
          return undefined; // No transform on error.
        })(value, cbContext);
      }

      if (
        validate &&
        !(await tryCatchAsync(validate, (err: unknown): boolean => {
          if (err instanceof FatalError) throw err;
          cbContext.logger.error('mapping validate failed', {
            event: cbContext.event,
            error: err,
          });
          return false; // Preserve "validation failed" semantic on throw.
        })(mappingValue, cbContext))
      )
        mappingValue = undefined;

      const property = castToProperty(mappingValue);
      return isDefined(property) ? property : castToProperty(staticValue);
    },
    Promise.resolve(undefined as WalkerOS.Property | undefined),
  );
}
