import { mergeMappingRule } from '@walkeros/core';
import type { GA4Mapping } from './types';

/**
 * Merge user mapping overrides onto the shipped defaults, per GA4 event key.
 * A user entry with `extend`/`remove` patches the default; otherwise it
 * replaces it. `GA4Mapping` values are single rules (no Rule[]), matching
 * the evaluator. `extend` only changes anything for keys that ship a default.
 */
export function mergeGa4Mapping(
  defaults: GA4Mapping,
  user: GA4Mapping,
): GA4Mapping {
  const merged: GA4Mapping = { ...defaults };
  for (const key of Object.keys(user)) {
    const userRule = user[key];
    if (!userRule) continue;
    const baseRule = defaults[key];
    merged[key] = baseRule
      ? mergeMappingRule(baseRule, userRule)
      : mergeMappingRule({}, userRule);
  }
  return merged;
}
