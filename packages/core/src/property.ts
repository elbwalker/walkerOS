import type { WalkerOS } from './types';
import {
  isArguments,
  isArray,
  isBoolean,
  isDefined,
  isNumber,
  isObject,
  isString,
} from './is';

/**
 * Checks if a value is a valid property type.
 *
 * @param value The value to check.
 * @returns True if the value is a valid property type, false otherwise.
 */
export function isPropertyType(value: unknown): value is WalkerOS.PropertyType {
  return (
    isBoolean(value) ||
    isString(value) ||
    isNumber(value) ||
    !isDefined(value) ||
    (isArray(value) && value.every(isPropertyType)) ||
    (isObject(value) && Object.values(value).every(isPropertyType))
  );
}

/**
 * Filters a value to only include valid property types.
 *
 * @param value The value to filter.
 * @returns The filtered value or undefined.
 */
export function filterValues(value: unknown): WalkerOS.Property | undefined {
  if (isBoolean(value) || isString(value) || isNumber(value)) return value;

  if (isArguments(value)) return filterValues(Array.from(value));

  if (isArray(value)) {
    return value
      .map((item) => filterValues(item))
      .filter((item): item is WalkerOS.PropertyType => item !== undefined);
  }

  if (isObject(value)) {
    return Object.entries(value).reduce<Record<string, WalkerOS.Property>>(
      (acc, [key, val]) => {
        const filteredValue = filterValues(val);
        if (filteredValue !== undefined) acc[key] = filteredValue;
        return acc;
      },
      {},
    );
  }

  return;
}

/**
 * Casts a value to a valid property type.
 *
 * @param value The value to cast.
 * @returns The casted value or undefined.
 */
export function castToProperty(value: unknown): WalkerOS.Property | undefined {
  return isPropertyType(value) ? value : undefined;
}
