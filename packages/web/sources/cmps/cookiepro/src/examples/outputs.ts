import type { WalkerOS } from '@walkeros/core';

/**
 * Expected walkerOS consent outputs.
 *
 * These represent the consent state after parsing OptanonActiveGroups
 * and mapping through the default categoryMap.
 *
 * Default map:
 * - C0001 -> necessary
 * - C0002 -> analytics
 * - C0003 -> functional
 * - C0004 -> marketing
 * - C0005 -> social
 *
 * All mapped walkerOS groups get explicit true/false values.
 * Active groups -> true, absent groups -> false.
 */

/**
 * Full consent mapped to walkerOS groups
 */
export const fullConsentMapped: WalkerOS.Consent = {
  necessary: true,
  functional: true,
  analytics: true,
  marketing: true,
  social: true,
};

/**
 * Partial consent - necessary + functional mapped
 * C0001 -> necessary (true), C0003 -> functional (true)
 * analytics and marketing absent -> false
 */
export const partialConsentMapped: WalkerOS.Consent = {
  necessary: true,
  functional: true,
  analytics: false,
  marketing: false,
  social: false,
};

/**
 * Minimal consent - only strictly necessary
 * C0001 -> necessary (true)
 * functional, analytics and marketing absent -> false
 */
export const minimalConsentMapped: WalkerOS.Consent = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
  social: false,
};

/**
 * Analytics only - necessary + performance
 * C0001 -> necessary (true), C0002 -> analytics (true)
 * functional and marketing absent -> false
 */
export const analyticsOnlyMapped: WalkerOS.Consent = {
  necessary: true,
  functional: false,
  analytics: true,
  marketing: false,
  social: false,
};

/**
 * Marketing only - necessary + targeting
 * C0001 -> necessary (true), C0004 -> marketing (true)
 * functional and analytics absent -> false
 */
export const marketingOnlyMapped: WalkerOS.Consent = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: true,
  social: false,
};
