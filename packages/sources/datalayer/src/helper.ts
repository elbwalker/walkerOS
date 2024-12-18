import type { WalkerOS } from '@elbwalker/types';
import { isObject } from '@elbwalker/utils';

export function isString(value: unknown): value is string {
  return typeof value === 'string';
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
