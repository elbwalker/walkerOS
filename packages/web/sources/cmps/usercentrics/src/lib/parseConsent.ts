import type { WalkerOS } from '@walkeros/core';
import type { UsercentricsEventDetail, Settings } from '../types';

/** Reserved keys in event.detail that are not service names */
export const RESERVED_KEYS = ['action', 'event', 'type', 'ucCategory'];

/**
 * Determine if ucCategory represents group-level consent.
 * Group-level: all values are booleans.
 * Service-level: some values are non-boolean (e.g., 'partial').
 */
export function isGroupLevel(
  ucCategory: Record<string, boolean | unknown>,
): boolean {
  return Object.values(ucCategory).every((val) => typeof val === 'boolean');
}

/**
 * Merge an incoming consent signal into the accumulating state using strict
 * AND semantics: absent key initialises from the incoming value; present key
 * becomes `true` only if both existing and incoming are `true`. Any single
 * `false` anywhere in the merge chain revokes consent for that key.
 *
 * This matches the consent rule of thumb: any deny signal denies. Permissive
 * (OR) and "last-wins" semantics are both unsafe for a privacy primitive.
 */
function mergeConsent(
  state: WalkerOS.Consent,
  key: string,
  value: boolean,
): void {
  state[key] = state[key] === undefined ? value : Boolean(state[key]) && value;
}

/**
 * Parse consent from Usercentrics event detail.
 *
 * Group-level: ucCategory values are all booleans → use them directly.
 * Service-level: ucCategory has non-booleans → mix boolean ucCategory entries
 * with top-level service keys from event.detail.
 *
 * categoryMap is applied in both modes to ucCategory boolean entries.
 * Strict AND: if multiple source categories map to the same target group,
 * the target is `true` only when ALL contributing sources are `true`.
 */
export function parseConsent(
  detail: UsercentricsEventDetail,
  settings: Settings,
): WalkerOS.Consent {
  const state: WalkerOS.Consent = {};

  if (detail.ucCategory && isGroupLevel(detail.ucCategory)) {
    Object.entries(detail.ucCategory).forEach(([category, value]) => {
      if (typeof value !== 'boolean') return;
      const mapped = settings.categoryMap?.[category] ?? category;
      mergeConsent(state, mapped, value);
    });
  } else {
    if (detail.ucCategory) {
      Object.entries(detail.ucCategory).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          const mapped = settings.categoryMap?.[key] ?? key;
          mergeConsent(state, mapped, value);
        }
      });
    }

    Object.entries(detail).forEach(([key, value]) => {
      if (RESERVED_KEYS.includes(key)) return;
      if (typeof value !== 'boolean') return;
      const normalized = key.toLowerCase().replace(/ /g, '_');
      mergeConsent(state, normalized, value);
    });
  }

  return state;
}
