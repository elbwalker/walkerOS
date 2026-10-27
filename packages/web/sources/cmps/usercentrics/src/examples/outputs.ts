import type { WalkerOS } from '@walkeros/core';

/**
 * Expected walkerOS consent outputs.
 *
 * These represent the consent state emitted via `elb('walker consent', state)`
 * after the V2 adapter aggregates `getServicesBaseInfo()` into group-level
 * consent (no category mapping configured: pass-through by `categorySlug`).
 */

/**
 * Full consent - all categories granted.
 */
export const fullConsentMapped: WalkerOS.Consent = {
  essential: true,
  functional: true,
  marketing: true,
};

/**
 * Partial consent - essential and functional granted, marketing denied.
 */
export const partialConsentMapped: WalkerOS.Consent = {
  essential: true,
  functional: true,
  marketing: false,
};

/**
 * Minimal consent - only essential granted.
 */
export const minimalConsentMapped: WalkerOS.Consent = {
  essential: true,
  functional: false,
  marketing: false,
};

/**
 * Full consent with a custom category mapping applied
 * (functional->analytics; essential keeps its own name).
 */
export const fullConsentCustomMapped: WalkerOS.Consent = {
  essential: true,
  analytics: true,
  marketing: true,
};
