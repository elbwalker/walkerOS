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
 * Parse consent from Usercentrics event detail.
 *
 * Group-level: ucCategory values are all booleans → use them directly.
 * Service-level: ucCategory has non-booleans → mix boolean ucCategory entries
 * with top-level service keys from event.detail.
 *
 * categoryMap is applied in both modes to ucCategory boolean entries.
 * OR logic: if ANY source category maps to a target group as true, that group is true.
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
      state[mapped] = state[mapped] || value;
    });
  } else {
    if (detail.ucCategory) {
      Object.entries(detail.ucCategory).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          const mapped = settings.categoryMap?.[key] ?? key;
          state[mapped] = state[mapped] || value;
        }
      });
    }

    Object.entries(detail).forEach(([key, value]) => {
      if (RESERVED_KEYS.includes(key)) return;
      if (typeof value !== 'boolean') return;
      const normalized = key.toLowerCase().replace(/ /g, '_');
      state[normalized] = value;
    });
  }

  return state;
}
