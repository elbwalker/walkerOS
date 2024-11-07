import type { WalkerOS } from '@elbwalker/types';

export function isArguments(value: unknown): value is IArguments {
  return typeof value === 'object' && value !== null && 'callee' in value;
}

export function isObject(value: unknown): value is WalkerOS.AnyObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function isValidEvent(value: unknown): value is WalkerOS.AnyObject {
  return isObject(value) && 'event' in value;
}
