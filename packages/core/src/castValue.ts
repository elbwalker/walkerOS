import type { WalkerOS } from './types';

/**
 * Casts a value to a specific type.
 *
 * @param value The value to cast.
 * @returns The casted value.
 */
export function castValue(value: unknown): WalkerOS.PropertyType {
  if (value === 'true') return true;
  if (value === 'false') return false;

  const number = Number(value); // Converts "" to 0
  if (value == number && value !== '') return number;

  return String(value);
}
