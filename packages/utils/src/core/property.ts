import type { WalkerOS } from '@elbwalker/types';
import { isArguments, isArray, isNumber, isObject } from './is';

export function isPropertyType(value: unknown): value is WalkerOS.PropertyType {
  return (
    typeof value === 'boolean' ||
    typeof value === 'string' ||
    isNumber(value) ||
    typeof value === 'undefined' ||
    (isArray(value) && value.every(isPropertyType)) ||
    (isObject(value) && Object.values(value).every(isPropertyType))
  );
}

export function filterValues(value: unknown): WalkerOS.Property | undefined {
  if (
    typeof value === 'boolean' ||
    typeof value === 'string' ||
    isNumber(value)
  )
    return value;

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

export function castToProperty(value: unknown): WalkerOS.Property | undefined {
  return isPropertyType(value) ? value : undefined;
}
