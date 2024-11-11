import type { WalkerOS } from '@elbwalker/types';

export function isObject(value: unknown): value is WalkerOS.AnyObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
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

export function convertConsentStates(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const consent: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    consent[key] =
      value == 'granted' ? true : value == 'denied' ? false : value;
  }

  return consent;
}
