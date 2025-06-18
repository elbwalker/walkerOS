import type { WalkerOS } from '@walkerOS/types';

export function castValue(value: unknown): WalkerOS.PropertyType {
  if (value === 'true') return true;
  if (value === 'false') return false;

  const number = Number(value); // Converts "" to 0
  if (value == number && value !== '') return number;

  return String(value);
}
