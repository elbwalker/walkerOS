import type { Mapping } from './types';
import { isObject } from './is';
import { clone } from './clone';

function mergePatch(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  for (const key of Object.keys(source)) {
    const val = source[key];
    if (val === undefined) continue;
    if (val === null) {
      delete target[key];
      continue;
    }
    const cur = target[key];
    if (isObject(val) && isObject(cur)) {
      mergePatch(cur, val);
    } else {
      target[key] = val;
    }
  }
  return target;
}

/**
 * Resolve a user mapping rule against a package-shipped default rule.
 * - No extend/remove → replace (clone of override; today's behavior).
 * - extend → partial rule deep-merged onto base (null clears a field).
 * - remove → carried onto the merged rule for eval-time output stripping.
 * The returned rule never contains `extend`.
 */
export function mergeMappingRule(
  base: Mapping.Rule,
  override: Mapping.Rule,
): Mapping.Rule {
  if (override.extend === undefined && override.remove === undefined) {
    return clone(override);
  }
  const merged: Record<string, unknown> = { ...clone(base) };
  if (override.extend) {
    const patch: Record<string, unknown> = { ...override.extend };
    mergePatch(merged, patch);
  }
  delete merged.extend;
  if (override.remove) merged.remove = [...override.remove];
  else delete merged.remove;
  return merged as Mapping.Rule;
}
