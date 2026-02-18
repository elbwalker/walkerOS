import type { WalkerOS } from '@walkeros/core';

/**
 * Expected walkerOS consent states after applying the default category map.
 * Tests verify implementation produces these outputs.
 *
 * Create this file BEFORE implementation (Phase 2).
 *
 * Key rule: denied groups MUST have explicit `false`, not be omitted.
 * The collector uses merge semantics (assign()), so omitting a key means
 * "no change," NOT "denied" (see mandatory check #1).
 */

/** Full consent mapped to walkerOS groups */
export const fullConsentMapped: WalkerOS.Consent = {
  functional: true,
  analytics: true,
  marketing: true,
};

/**
 * Partial consent mapped to walkerOS groups.
 * Denied groups have explicit false, not omitted.
 */
export const partialConsentMapped: WalkerOS.Consent = {
  functional: true,
  analytics: false,
  marketing: false,
};

/**
 * Minimal consent mapped to walkerOS groups.
 * Note: functional is true because necessary=true maps to functional.
 */
export const minimalConsentMapped: WalkerOS.Consent = {
  functional: true,
  analytics: false,
  marketing: false,
};

/**
 * Analytics only consent mapped to walkerOS groups.
 * Note: functional is true because necessary=true maps to functional
 * (OR logic: if ANY source category is true, target group is true).
 */
export const analyticsOnlyMapped: WalkerOS.Consent = {
  functional: true,
  analytics: true,
  marketing: false,
};

/**
 * Marketing only consent mapped to walkerOS groups.
 * Note: functional is true because necessary=true maps to functional
 * (OR logic: if ANY source category is true, target group is true).
 */
export const marketingOnlyMapped: WalkerOS.Consent = {
  functional: true,
  analytics: false,
  marketing: true,
};
