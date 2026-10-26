import type { WalkerOS } from '@walkeros/core';

/**
 * Expected walkerOS consent states after applying the default category map.
 * Tests verify implementation produces these outputs.
 *
 * Create this file BEFORE implementation (Phase 2).
 *
 * `necessary` has no entry in the default map and keeps its own name, so
 * strictly necessary cookies grant no consent group (mandatory check 11).
 *
 * Key rule: denied groups MUST have explicit `false`, not be omitted.
 * The collector uses merge semantics (assign()), so omitting a key means
 * "no change," NOT "denied" (see mandatory check #1).
 */

/** Full consent mapped to walkerOS groups */
export const fullConsentMapped: WalkerOS.Consent = {
  necessary: true,
  functional: true,
  analytics: true,
  marketing: true,
};

/**
 * Partial consent mapped to walkerOS groups.
 * Denied groups have explicit false, not omitted.
 */
export const partialConsentMapped: WalkerOS.Consent = {
  necessary: true,
  functional: true,
  analytics: false,
  marketing: false,
};

/**
 * Minimal consent mapped to walkerOS groups.
 */
export const minimalConsentMapped: WalkerOS.Consent = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

/**
 * Analytics only consent mapped to walkerOS groups.
 */
export const analyticsOnlyMapped: WalkerOS.Consent = {
  necessary: true,
  functional: false,
  analytics: true,
  marketing: false,
};

/**
 * Marketing only consent mapped to walkerOS groups.
 */
export const marketingOnlyMapped: WalkerOS.Consent = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: true,
};
