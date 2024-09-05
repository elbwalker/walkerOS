import type { WalkerOS } from '@elbwalker/types';
import { getByStringDot, hasValue, isSameType } from '..';

export type MappingValue = string | MappingValueOptions;

export interface MappingValueOptions {
  key?: string; // Dot notation key to access event data
  default?: unknown; // Default value if the key is undefined
}

export function getMappingValue(
  event: WalkerOS.Event,
  mapping?: MappingValue,
  defaultValue?: unknown,
): unknown | undefined {
  if (!mapping) return defaultValue;

  const mappingObject: MappingValue = isSameType(mapping, '' as string)
    ? { key: mapping }
    : mapping;

  // Get the key from the mapping object
  const key = mappingObject.key;

  const value = key ? getByStringDot(event, key) : undefined;

  // Explicitly check for undefined to allow for falsy, null or empty values
  return hasValue(value) ? value : mappingObject.default ?? defaultValue;
}
