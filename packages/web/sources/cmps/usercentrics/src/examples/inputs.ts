import type { UsercentricsEventDetail } from '../types';

/**
 * Example Usercentrics consent event detail inputs.
 *
 * These represent real event.detail payloads from Usercentrics CMP.
 */

/**
 * Full consent - user accepted all categories (explicit)
 */
export const fullConsent: UsercentricsEventDetail = {
  event: 'consent_status',
  type: 'explicit',
  action: 'onAcceptAllServices',
  ucCategory: {
    essential: true,
    functional: true,
    marketing: true,
  },
  'Google Analytics': true,
  'Google Ads Remarketing': true,
};

/**
 * Partial consent - user accepted only essential and functional (explicit)
 */
export const partialConsent: UsercentricsEventDetail = {
  event: 'consent_status',
  type: 'explicit',
  action: 'onUpdateServices',
  ucCategory: {
    essential: true,
    functional: true,
    marketing: false,
  },
  'Google Analytics': true,
  'Google Ads Remarketing': false,
};

/**
 * Minimal consent - user denied everything except essential (explicit)
 */
export const minimalConsent: UsercentricsEventDetail = {
  event: 'consent_status',
  type: 'explicit',
  action: 'onDenyAllServices',
  ucCategory: {
    essential: true,
    functional: false,
    marketing: false,
  },
  'Google Analytics': false,
  'Google Ads Remarketing': false,
};

/**
 * Implicit consent - page load with default consent state
 * (not an explicit user choice)
 */
export const implicitConsent: UsercentricsEventDetail = {
  event: 'consent_status',
  type: 'implicit',
  ucCategory: {
    essential: true,
    functional: false,
    marketing: false,
  },
  'Google Analytics': false,
  'Google Ads Remarketing': false,
};

/**
 * Explicit consent with uppercase type field (Usercentrics docs are
 * inconsistent about casing - some show 'EXPLICIT', others 'explicit')
 */
export const fullConsentUpperCase: UsercentricsEventDetail = {
  event: 'consent_status',
  type: 'EXPLICIT',
  action: 'onAcceptAllServices',
  ucCategory: {
    essential: true,
    functional: true,
    marketing: true,
  },
};

/**
 * Service-level consent - ucCategory has mixed types (non-boolean values
 * indicate individual service-level choice rather than group-level)
 */
export const serviceLevelConsent: UsercentricsEventDetail = {
  event: 'consent_status',
  type: 'explicit',
  action: 'onUpdateServices',
  ucCategory: {
    essential: true,
    functional: 'partial', // Non-boolean indicates mixed service choices
    marketing: 'partial',
  },
  'Google Analytics': true,
  'Google Ads Remarketing': false,
  Hotjar: true,
};

/**
 * Non-consent event (should be ignored)
 */
export const nonConsentEvent: UsercentricsEventDetail = {
  event: 'other_event',
  type: 'explicit',
};
