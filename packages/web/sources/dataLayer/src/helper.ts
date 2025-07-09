import type { DataLayer } from './types';
import { isArray } from '@walkerOS/core';

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

export function getDataLayer(name = 'dataLayer'): DataLayer | false {
  // Ensure the dataLayer exists
  if (!window[name]) window[name] = [];

  return isArray(window[name]) ? window[name] : false;
}
