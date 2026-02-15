import type { WalkerOS } from '@walkeros/core';

/**
 * Expected walkerOS consent outputs.
 *
 * These represent the consent state after parsing Usercentrics event details
 * with no category mapping configured (pass-through).
 */

/**
 * Full consent - all categories true (group-level)
 */
export const fullConsentMapped: WalkerOS.Consent = {
  essential: true,
  functional: true,
  marketing: true,
};

/**
 * Partial consent - essential and functional true, marketing false
 */
export const partialConsentMapped: WalkerOS.Consent = {
  essential: true,
  functional: true,
  marketing: false,
};

/**
 * Minimal consent - only essential true
 */
export const minimalConsentMapped: WalkerOS.Consent = {
  essential: true,
  functional: false,
  marketing: false,
};

/**
 * Full consent with custom category mapping applied
 * (essential->functional, functional->functional, marketing->marketing)
 */
export const fullConsentCustomMapped: WalkerOS.Consent = {
  functional: true,
  marketing: true,
};

/**
 * Service-level consent - individual service booleans + boolean ucCategory entries
 * (services normalized: lowercase, spaces to underscores)
 * (ucCategory boolean entries mapped through categoryMap)
 */
export const serviceLevelMapped: WalkerOS.Consent = {
  essential: true,
  google_analytics: true,
  google_ads_remarketing: false,
  hotjar: true,
};
