import type { WalkerOS } from '@elbwalker/types';

export function isDefined<T>(val: T | undefined): val is T {
  return typeof val !== 'undefined';
}

export function isObject(value: unknown): value is WalkerOS.AnyObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isSameType<T>(
  variable: unknown,
  type: T,
): variable is typeof type {
  return typeof variable === typeof type;
}
