import type { Collector, WalkerOS } from '@walkeros/core';
import type { CustomDimensions } from './types';
import { getMappingValue, isObject } from '@walkeros/core';

/** Bare dimension id to its resolved value, undefined when nothing resolved. */
export type DimensionValues = Record<string, string | undefined>;

// The tracker's own key format for the dimensions argument.
const DIMENSION_KEY = /^dimension\d+$/;

// A bare dimension id, the same rule as the settings schema.
const DIMENSION_ID = /^\d+$/;

/** Resolves every Mapping Value of a dimension map against the event. */
export async function resolveDimensionMap(
  map: CustomDimensions | undefined,
  event: WalkerOS.Event,
  collector: Collector.Instance,
): Promise<DimensionValues> {
  const values: DimensionValues = {};
  if (!map) return values;

  for (const [id, value] of Object.entries(map)) {
    const resolved = await getMappingValue(event, value, { collector });
    values[id] =
      resolved === undefined || resolved === null
        ? undefined
        : String(resolved);
  }

  return values;
}

/**
 * For methods WITH a dimensions argument: `{ dimensionN: encodeURIComponent(v) }`
 * from destination and rule values (rule wins per key), merged under the
 * argument object's own `dimensionN` keys (argument wins, passed as is).
 * A value that cannot be encoded (a lone surrogate) is dropped.
 */
export function toDimensionsArgument(
  destination: DimensionValues,
  rule: DimensionValues,
  argument: unknown,
): Record<string, string> {
  const dimensions: Record<string, string> = {};

  for (const [id, value] of sortedEntries({ ...destination, ...rule })) {
    const encoded = value === undefined ? undefined : encode(value);
    if (encoded !== undefined) dimensions[`dimension${id}`] = encoded;
  }

  if (isObject(argument)) {
    for (const [key, value] of Object.entries(argument)) {
      if (DIMENSION_KEY.test(key) && value !== undefined && value !== null)
        dimensions[key] = String(value);
    }
  }

  return dimensions;
}

/** Commands that apply a map: setCustomDimensionValue for defined values, deleteCustomDimension for undefined. */
export function applyCommands(values: DimensionValues): unknown[][] {
  return sortedEntries(values).map(([id, value]) =>
    value === undefined
      ? ['deleteCustomDimension', Number(id)]
      : ['setCustomDimensionValue', Number(id), value],
  );
}

/**
 * The before and after command lists around a hit of a method WITHOUT a
 * dimensions argument. Before the hit the merged map applies; after it the
 * rule-only keys are deleted and the destination map applies again, so a
 * rule value never leaks into the tracker's automatic hits. Without rule
 * values the tracker already holds the destination map, so nothing follows.
 */
export function sequence(
  destination: DimensionValues,
  rule: DimensionValues,
): { before: unknown[][]; after: unknown[][] } {
  const before = applyCommands({ ...destination, ...rule });
  if (Object.keys(rule).length === 0) return { before, after: [] };

  // Rule-only keys to delete; one that resolved to undefined was already
  // deleted before the hit.
  const ruleOnly: DimensionValues = {};
  for (const [id, value] of Object.entries(rule)) {
    if (
      !Object.prototype.hasOwnProperty.call(destination, id) &&
      value !== undefined
    )
      ruleOnly[id] = undefined;
  }

  return {
    before,
    after: [...applyCommands(ruleOnly), ...applyCommands(destination)],
  };
}

/** Entries with a bare integer id, ascending by id; any other key is ignored. */
function sortedEntries(
  values: DimensionValues,
): Array<[string, string | undefined]> {
  return Object.entries(values)
    .filter(([id]) => DIMENSION_ID.test(id))
    .sort(([a], [b]) => Number(a) - Number(b));
}

/** Percent-encodes a value; undefined when it cannot be (a lone surrogate). */
function encode(value: string): string | undefined {
  try {
    return encodeURIComponent(value);
  } catch {
    return undefined;
  }
}
