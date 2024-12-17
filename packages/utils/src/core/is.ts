import type { WalkerOS } from '@elbwalker/types';

export function isArguments(value: unknown): value is IArguments {
  return Object.prototype.toString.call(value) === '[object Arguments]';
}

export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isDefined<T>(val: T | undefined): val is T {
  return typeof val !== 'undefined';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

export function isObject(value: unknown): value is WalkerOS.AnyObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    !isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

export function isSameType<T>(
  variable: unknown,
  type: T,
): variable is typeof type {
  return typeof variable === typeof type;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}
