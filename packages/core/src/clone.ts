/**
 * Creates a deep clone of a value.
 * Supports primitive values, objects, arrays, dates, and regular expressions.
 * Handles circular references.
 *
 * @template T
 * @param org - The value to clone.
 * @param visited - A map of visited objects to handle circular references.
 * @returns The cloned value.
 */
export function clone<T>(
  org: T,
  visited: WeakMap<object, unknown> = new WeakMap(),
): T {
  // Handle primitive values and functions directly
  if (typeof org !== 'object' || org === null) return org;

  // Check for circular references
  if (visited.has(org)) return visited.get(org) as T;

  // Allow list of clonable types
  const type = Object.prototype.toString.call(org);
  if (type === '[object Object]') {
    const clonedObj = {} as Record<string | symbol, unknown>;
    visited.set(org as object, clonedObj); // Remember the reference

    for (const key in org as Record<string | symbol, unknown>) {
      if (Object.prototype.hasOwnProperty.call(org, key)) {
        clonedObj[key] = clone(
          (org as Record<string | symbol, unknown>)[key],
          visited,
        );
      }
    }
    return clonedObj as T;
  }

  if (type === '[object Array]') {
    const clonedArray = [] as unknown[];
    visited.set(org as object, clonedArray); // Remember the reference

    (org as unknown[]).forEach((item) => {
      clonedArray.push(clone(item, visited));
    });

    return clonedArray as T;
  }

  if (type === '[object Date]') {
    return new Date((org as unknown as Date).getTime()) as T;
  }

  if (type === '[object RegExp]') {
    const reg = org as unknown as RegExp;
    return new RegExp(reg.source, reg.flags) as T;
  }

  // Skip cloning for unsupported types and return reference
  return org;
}
