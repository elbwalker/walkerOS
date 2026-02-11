import type { Source, Collector } from '@walkeros/core';
import { isString } from '@walkeros/core';

/**
 * Normalize user-facing BeforeCondition[] to internal PendingCondition[].
 * String conditions become { type, test: undefined }.
 * Object conditions become { type, test: fn }.
 */
export function normalizeBeforeConditions(
  conditions: Source.BeforeCondition[] | undefined,
): Collector.PendingCondition[] {
  if (!conditions) return [];

  return conditions.map((condition): Collector.PendingCondition => {
    if (isString(condition)) {
      return { type: condition, test: undefined };
    }

    const [type, testFn] = Object.entries(condition)[0];

    return {
      type,
      test: testFn as (data: unknown) => boolean,
    };
  });
}
