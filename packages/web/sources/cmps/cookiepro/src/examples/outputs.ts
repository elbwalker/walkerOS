import type { WalkerOS } from '@walkeros/core';

/**
 * Expected walkerOS consent outputs.
 *
 * These represent the consent state after parsing OptanonActiveGroups
 * and mapping through the default categoryMap.
 *
 * Default map:
 * - C0001 -> functional
 * - C0002 -> analytics
 * - C0003 -> functional
 * - C0004 -> marketing
 * - C0005 -> marketing
 *
 * All mapped walkerOS groups get explicit true/false values.
 * Active groups -> true, absent groups -> false.
 */

/**
 * Full consent mapped to walkerOS groups
 */
export const fullConsentMapped: WalkerOS.Consent = {
  functional: true,
  analytics: true,
  marketing: true,
};

/**
 * Partial consent - necessary + functional mapped
 * C0001 -> functional (true), C0003 -> functional (true)
 * analytics and marketing absent -> false
 */
export const partialConsentMapped: WalkerOS.Consent = {
  functional: true,
  analytics: false,
  marketing: false,
};

/**
 * Minimal consent - only strictly necessary
 * C0001 -> functional (true)
 * analytics and marketing absent -> false
 */
export const minimalConsentMapped: WalkerOS.Consent = {
  functional: true,
  analytics: false,
  marketing: false,
};

/**
 * Analytics only - necessary + performance
 * C0001 -> functional (true), C0002 -> analytics (true)
 * marketing absent -> false
 */
export const analyticsOnlyMapped: WalkerOS.Consent = {
  functional: true,
  analytics: true,
  marketing: false,
};

/**
 * Marketing only - necessary + targeting
 * C0001 -> functional (true), C0004 -> marketing (true)
 * analytics absent -> false
 */
export const marketingOnlyMapped: WalkerOS.Consent = {
  functional: true,
  analytics: false,
  marketing: true,
};
