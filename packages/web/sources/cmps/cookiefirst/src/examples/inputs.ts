import type { CookieFirstConsent } from '../types';

/**
 * Example CookieFirst consent inputs.
 *
 * These represent real consent states from CookieFirst CMP.
 */

/**
 * Full consent - user accepted all categories
 */
export const fullConsent: CookieFirstConsent = {
  necessary: true,
  functional: true,
  performance: true,
  advertising: true,
};

/**
 * Partial consent - user accepted only necessary and functional
 */
export const partialConsent: CookieFirstConsent = {
  necessary: true,
  functional: true,
  performance: false,
  advertising: false,
};

/**
 * Minimal consent - user accepted only necessary (required)
 */
export const minimalConsent: CookieFirstConsent = {
  necessary: true,
  functional: false,
  performance: false,
  advertising: false,
};

/**
 * No consent - user hasn't made a choice yet
 * CookieFirst returns null when no explicit choice has been made
 */
export const noConsent: CookieFirstConsent | null = null;

/**
 * Analytics only - user accepted performance tracking
 */
export const analyticsOnlyConsent: CookieFirstConsent = {
  necessary: true,
  functional: false,
  performance: true,
  advertising: false,
};

/**
 * Marketing only - user accepted advertising
 */
export const marketingOnlyConsent: CookieFirstConsent = {
  necessary: true,
  functional: false,
  performance: false,
  advertising: true,
};
