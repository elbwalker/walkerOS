import type { WalkerOS } from '@elbwalker/types';

export function isPropertyType(value: unknown): value is WalkerOS.PropertyType {
  return (
    typeof value === 'boolean' ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'undefined' ||
    (Array.isArray(value) && value.every(isPropertyType)) ||
    (typeof value === 'object' &&
      value !== null &&
      Object.values(value).every(isPropertyType))
  );
}

export function castToProperty(value: unknown): WalkerOS.Property | undefined {
  return isPropertyType(value) ? value : undefined;
}
