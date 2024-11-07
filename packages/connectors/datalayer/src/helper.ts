import type { WalkerOS } from '@elbwalker/types';

export function isObject(value: unknown): value is WalkerOS.AnyObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isValidEvent(value: unknown): value is WalkerOS.AnyObject {
  return isObject(value) && 'event' in value;
}

export function wasArguments(obj: unknown): obj is WalkerOS.AnyObject {
  return (
    isObject(obj) &&
    Object.keys(obj).every((key, index) => key === String(index))
  );
}
