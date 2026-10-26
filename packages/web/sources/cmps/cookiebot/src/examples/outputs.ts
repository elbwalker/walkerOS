import type { WalkerOS } from '@walkeros/core';

/**
 * Expected walkerOS consent states after mapping through the default
 * categoryMap:
 * - preferences -> functional
 * - statistics -> analytics
 * - marketing -> marketing
 *
 * `necessary` has no entry and keeps its own name. Denied groups carry an
 * explicit false.
 */

/**
 * Full consent mapped to walkerOS groups
 */
export const fullConsentMapped: WalkerOS.Consent = {
  necessary: true,
  functional: true,
  analytics: true,
  marketing: true,
};

/**
 * Partial consent - marketing denied
 */
export const partialConsentMapped: WalkerOS.Consent = {
  necessary: true,
  functional: true,
  analytics: true,
  marketing: false,
};

/**
 * Necessary only - functional, analytics and marketing denied
 */
export const necessaryOnlyMapped: WalkerOS.Consent = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

/**
 * Partial consent with statistics mapped to a custom `statistics` group
 */
export const partialConsentCustomMapped: WalkerOS.Consent = {
  necessary: true,
  functional: true,
  statistics: true,
  marketing: false,
};
