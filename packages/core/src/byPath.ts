import type { WalkerOS } from './types';
import { isArray, isDefined, isObject } from './is';
import { clone } from './clone';

/**
 * Gets a value from an object by a dot-notation string.
 * Supports wildcards for arrays.
 *
 * @example
 * getByPath({ data: { id: 1 } }, "data.id") // Returns 1
 *
 * @param event - The object to get the value from.
 * @param key - The dot-notation string.
 * @param defaultValue - The default value to return if the key is not found.
 * @returns The value from the object or the default value.
 */
export function getByPath(
  event: unknown,
  key: string = '',
  defaultValue?: unknown,
): unknown {
  const keys = key.split('.');
  let values: unknown = event;

  for (let index = 0; index < keys.length; index++) {
    const k = keys[index];

    if (k === '*' && isArray(values)) {
      const remainingKeys = keys.slice(index + 1).join('.');
      const result: unknown[] = [];

      for (const item of values) {
        const value = getByPath(item, remainingKeys, defaultValue);
        result.push(value);
      }

      return result;
    }

    values =
      isObject(values) || isArray(values)
        ? values[k as keyof typeof values]
        : undefined;

    if (values === undefined) break;
  }

  return isDefined(values) ? values : defaultValue;
}

/**
 * Sets a value in an object by a dot-notation string.
 *
 * @param obj - The object to set the value in.
 * @param key - The dot-notation string.
 * @param value - The value to set.
 * @returns A new object with the updated value.
 */
export function setByPath<T = unknown>(obj: T, key: string, value: unknown): T {
  if (!isObject(obj)) return obj;

  const clonedObj = clone(obj);
  const keys = key.split('.');
  let current: WalkerOS.AnyObject = clonedObj;

  for (let i = 0; i < keys.length; i++) {
    const k = keys[i] as keyof typeof current;

    // Set the value if it's the last key
    if (i === keys.length - 1) {
      current[k] = value;
    } else {
      // Traverse to the next level
      if (
        !(k in current) ||
        typeof current[k] !== 'object' ||
        current[k] === null
      ) {
        current[k] = {};
      }

      // Move deeper into the object
      current = current[k] as WalkerOS.AnyObject;
    }
  }

  return clonedObj as T;
}

/**
 * Deletes a value in an object by a dot-notation string.
 * Returns a new object; the input is not mutated. No-op when the path is
 * absent or the target is neither an object nor an array. Numeric segments
 * index into arrays; a final numeric segment splices the element out so no
 * empty slot is left behind.
 */
export function deleteByPath<T = unknown>(obj: T, key: string): T {
  if (!isObject(obj) && !isArray(obj)) return obj;
  const clonedObj = clone(obj);
  const keys = key.split('.');
  let current: WalkerOS.AnyObject | unknown[] = clonedObj;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const isLast = i === keys.length - 1;

    if (isArray(current)) {
      const index = Number(k);
      if (!Number.isInteger(index) || index < 0 || index >= current.length)
        return clonedObj;
      if (isLast) {
        current.splice(index, 1);
      } else {
        const next = current[index];
        if (!isObject(next) && !isArray(next)) return clonedObj;
        current = next;
      }
    } else if (isLast) {
      delete current[k];
    } else {
      const next = current[k];
      if (!isObject(next) && !isArray(next)) return clonedObj;
      current = next;
    }
  }
  return clonedObj as T;
}
