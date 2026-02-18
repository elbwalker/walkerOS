import type { WalkerOS } from '@walkeros/core';

/**
 * Expected walkerOS consent outputs.
 *
 * These represent the consent state after mapping CookieFirst categories
 * to walkerOS consent groups using the default category map.
 */

/**
 * Full consent mapped to walkerOS groups
 * (necessary + functional → functional, performance → analytics, advertising → marketing)
 */
export const fullConsentMapped: WalkerOS.Consent = {
  functional: true,
  analytics: true,
  marketing: true,
};

/**
 * Partial consent mapped to walkerOS groups
 */
export const partialConsentMapped: WalkerOS.Consent = {
  functional: true,
  analytics: false,
  marketing: false,
};

/**
 * Minimal consent mapped to walkerOS groups
 */
export const minimalConsentMapped: WalkerOS.Consent = {
  functional: true,
  analytics: false,
  marketing: false,
};

/**
 * Analytics only consent mapped to walkerOS groups
 * Note: functional is true because necessary=true maps to functional
 * (OR logic: if ANY source category is true, target group is true)
 */
export const analyticsOnlyMapped: WalkerOS.Consent = {
  functional: true,
  analytics: true,
  marketing: false,
};

/**
 * Marketing only consent mapped to walkerOS groups
 * Note: functional is true because necessary=true maps to functional
 * (OR logic: if ANY source category is true, target group is true)
 */
export const marketingOnlyMapped: WalkerOS.Consent = {
  functional: true,
  analytics: false,
  marketing: true,
};
