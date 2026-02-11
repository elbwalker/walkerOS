import type { Source, Collector } from '@walkeros/core';
import { isString } from '@walkeros/core';
import { initSource } from './source';

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

/**
 * Evaluate pending sources and init any whose conditions are all met.
 * Called from onApply after notifying sources/destinations/callbacks.
 *
 * Uses splice-before-init for re-entrancy safety:
 * source init may fire commands that re-enter commonHandleCommand -> onApply.
 * By removing the entry before init, nested calls see a clean array.
 */
export async function activatePendingSources(
  collector: Collector.Instance,
  type: string,
  contextData: unknown,
): Promise<void> {
  let i = 0;
  while (i < collector.pendingSources.length) {
    const pending = collector.pendingSources[i];

    // Re-entrancy guard: skip if already initialized by a nested call
    if (collector.sources[pending.id]) {
      collector.pendingSources.splice(i, 1);
      continue;
    }

    // Evaluate conditions: keep those that are NOT satisfied
    const remaining = pending.conditions.filter((condition) => {
      if (condition.type !== type) return true; // Different type, keep

      if (!condition.test) return false; // Simple condition, satisfied

      // Evaluate condition function against event data
      try {
        return !condition.test(contextData); // true from test = remove, false = keep
      } catch {
        return true; // Error in test = keep (not satisfied)
      }
    });

    if (remaining.length === 0) {
      // All conditions met — splice BEFORE init (re-entrancy safe)
      collector.pendingSources.splice(i, 1);

      const instance = await initSource(
        collector,
        pending.id,
        pending.definition,
      );
      if (instance) {
        collector.sources[pending.id] = instance;
      }
      // Don't increment — next element shifted down after splice
    } else {
      pending.conditions = remaining;
      i++;
    }
  }
}
