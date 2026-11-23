import type { WalkerOS } from '@walkeros/core';

/**
 * Expected walkerOS consent states after mapping through the default
 * categoryMap:
 * - ads -> marketing
 *
 * `necessary` and `analytics` have no entry and keep their own names.
 * Rejected categories carry an explicit false.
 */

/**
 * Accept all mapped to walkerOS groups
 */
export const acceptAllMapped: WalkerOS.Consent = {
  necessary: true,
  analytics: true,
  marketing: true,
};

/**
 * Reject all - analytics and marketing denied
 */
export const rejectAllMapped: WalkerOS.Consent = {
  necessary: true,
  analytics: false,
  marketing: false,
};

/**
 * Analytics only - marketing denied
 */
export const analyticsOnlyMapped: WalkerOS.Consent = {
  necessary: true,
  analytics: true,
  marketing: false,
};

/**
 * Custom category - functionality passes through under its own name
 */
export const customCategoryMapped: WalkerOS.Consent = {
  necessary: true,
  functionality: true,
  analytics: false,
  marketing: false,
};

/**
 * Analytics only with analytics mapped to a custom `statistics` group
 */
export const analyticsOnlyCustomMapped: WalkerOS.Consent = {
  necessary: true,
  statistics: true,
  marketing: false,
};
