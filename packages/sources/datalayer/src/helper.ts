import type { DataLayer } from './types';

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

export function getDataLayer(name = 'dataLayer'): DataLayer {
  // Ensure the dataLayer exists
  if (!window[name]) window[name] = [];

  return window[name] || [];
}
