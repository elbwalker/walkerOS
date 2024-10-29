import type { WalkerOS } from '@elbwalker/types';

export function isPropertyType(value: unknown): value is WalkerOS.PropertyType {
  return (
    typeof value === 'boolean' ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'undefined'
  );
}

export function isProperty(value: unknown): value is WalkerOS.Property {
  return (
    isPropertyType(value) ||
    (Array.isArray(value) && value.every(isPropertyType))
  );
}

export function castToProperty(value: unknown): WalkerOS.Property | undefined {
  return isProperty(value) ? value : undefined;
}
