import { isObject } from './is';

/**
 * Deep merges source into target, mutating target in-place.
 * Recurses into plain objects; everything else is a leaf (replaced).
 * Skips undefined source values; null overwrites.
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>,
): T {
  if (!isObject(source)) return target;

  for (const key of Object.keys(source)) {
    const val = source[key];
    if (val === undefined) continue;

    if (isObject(val) && isObject(target[key])) {
      deepMerge(target[key] as Record<string, unknown>, val);
    } else {
      (target as Record<string, unknown>)[key] = val;
    }
  }

  return target;
}
