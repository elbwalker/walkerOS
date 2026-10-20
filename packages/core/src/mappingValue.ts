import type { Mapping, WalkerOS } from './types';
import { getByPath } from './byPath';
import { isArray, isDefined, isString } from './is';
import { castToProperty } from './property';
import { tryCatchAsync } from './tryCatch';
import { FatalError } from './fatalError';
import { getGrantedConsent } from './consent';
import { reportCause } from './causeLog';

// Package-internal value resolution shared by `mapping.ts` and `state.ts`.
// Not re-exported from the package index: `getMappingValue` is the public
// entry point.

/** Where a value is resolved, for the report of a value that failed. */
export interface ValueTrace {
  /** The matched rule's mapping key, when a rule matched. */
  mappingKey?: string;
}

/** The keys a value config is made of; an object with none of them has no operator. */
const VALUE_KEYS = [
  'condition',
  'consent',
  'fn',
  'key',
  'loop',
  'map',
  'set',
  'validate',
  'value',
] as const satisfies ReadonlyArray<keyof Mapping.ValueConfig>;

/**
 * Report a value dropped by throwing user code or a malformed config: one
 * line per cause through the collector's cause log, with the event's name
 * and the mapping key, never the event. The event itself is still delivered.
 */
function reportValue(
  context: Mapping.Context,
  trace: ValueTrace | undefined,
  message: string,
  err?: unknown,
): void {
  const name = context.event.name;
  reportCause(
    context.collector,
    context.logger,
    { step: 'mapping', code: 'mapping' },
    message,
    {
      ...(typeof name === 'string' ? { event: name } : {}),
      ...(trace?.mappingKey ? { mappingKey: trace.mappingKey } : {}),
      ...(err !== undefined ? { error: err } : {}),
    },
  );
}

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
  trace?: ValueTrace,
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
        // The value is dropped, the event goes on: not a failed event.
        reportValue(baseContext, trace, 'mapping value failed', err);
        return undefined;
      },
    )(
      value,
      mapping,
      {
        ...baseContext,
        mapping,
      },
      trace,
    );
    if (isDefined(result)) return result;
  }
  return;
}

async function processMappingValue(
  value: WalkerOS.DeepPartialEvent | unknown,
  mapping: Mapping.Value,
  context: Mapping.Context,
  trace: ValueTrace | undefined,
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

      // An object without any operator (`{ total: 'data.total' }` where
      // `{ map: { total: 'data.total' } }` was meant) would resolve to the
      // whole input. Drop it and say how to fix it.
      if (!VALUE_KEYS.some((name) => name in mapping)) {
        reportValue(
          { ...context, mapping: mappingItem },
          trace,
          `mapping value has no operator (${Object.keys(mapping).join(', ')}): wrap the fields in map, or use key, value, fn, loop or set`,
        );
        return;
      }

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
          reportValue(cbContext, trace, 'mapping condition failed', err);
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
            : await resolveMappingValue(value, scope, cbContext, trace);

        // Each item is mapped with the parent's consent: a `consent` key on
        // the item is plain data and never grants anything. Undefined items
        // stay filtered out.
        mappingValue = isArray(data)
          ? (
              await Promise.all(
                data.map((item) =>
                  isDefined(item)
                    ? resolveMappingValue(item, itemMapping, cbContext, trace)
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
              trace,
            );
            if (isDefined(result)) mappedObj[mapKey] = result;
            return mappedObj;
          },
          Promise.resolve({} as WalkerOS.AnyObject),
        );
      } else if (set) {
        mappingValue = await Promise.all(
          set.map((item) => processMappingValue(value, item, cbContext, trace)),
        );
      } else if (key) {
        mappingValue = getByPath(value, key, staticValue);
      } else if (fn) {
        mappingValue = await tryCatchAsync(fn, (err: unknown): undefined => {
          if (err instanceof FatalError) throw err;
          reportValue(cbContext, trace, 'mapping fn failed', err);
          return undefined; // No transform on error.
        })(value, cbContext);
      }

      if (
        validate &&
        !(await tryCatchAsync(validate, (err: unknown): boolean => {
          if (err instanceof FatalError) throw err;
          reportValue(cbContext, trace, 'mapping validate failed', err);
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
