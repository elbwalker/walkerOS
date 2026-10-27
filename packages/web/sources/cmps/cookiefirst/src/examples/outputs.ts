import type { WalkerOS } from '@walkeros/core';

/**
 * Expected walkerOS consent outputs.
 *
 * These represent the consent state after mapping CookieFirst categories
 * to walkerOS consent groups using the default category map.
 */

/**
 * Full consent mapped to walkerOS groups
 * (functional → functional, performance → analytics, advertising → marketing;
 * necessary has no entry and keeps its own name)
 */
export const fullConsentMapped: WalkerOS.Consent = {
  necessary: true,
  functional: true,
  analytics: true,
  marketing: true,
};

/**
 * Partial consent mapped to walkerOS groups
 */
export const partialConsentMapped: WalkerOS.Consent = {
  necessary: true,
  functional: true,
  analytics: false,
  marketing: false,
};

/**
 * Minimal consent mapped to walkerOS groups
 */
export const minimalConsentMapped: WalkerOS.Consent = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

/**
 * Analytics only consent mapped to walkerOS groups
 */
export const analyticsOnlyMapped: WalkerOS.Consent = {
  necessary: true,
  functional: false,
  analytics: true,
  marketing: false,
};

/**
 * Marketing only consent mapped to walkerOS groups
 */
export const marketingOnlyMapped: WalkerOS.Consent = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: true,
};
