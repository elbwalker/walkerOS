import type { Collector, WalkerOS } from '@walkeros/core';
import type { CustomDimensions } from './types';
import { getMappingValue } from '@walkeros/core';

/** Bare dimension id to its resolved value, undefined when nothing resolved. */
export type DimensionValues = Record<string, string | undefined>;

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

/** Commands that apply a map: setCustomDimension for defined values, deleteCustomDimension for undefined. */
export function applyCommands(values: DimensionValues): unknown[][] {
  return sortedEntries(values).map(([id, value]) =>
    value === undefined
      ? ['deleteCustomDimension', Number(id)]
      : ['setCustomDimension', Number(id), value],
  );
}

/**
 * The before and after command lists around an event's hits. Before them the
 * merged map applies; after them the rule-only keys are deleted and the
 * destination map applies again, so a rule value never leaks into later
 * hits. Without rule values the tracker already holds the destination map,
 * so nothing follows.
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
    const shared = Object.prototype.hasOwnProperty.call(destination, id);
    if (!shared && value !== undefined) ruleOnly[id] = undefined;
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
