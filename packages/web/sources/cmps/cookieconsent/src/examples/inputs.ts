import type { UserPreferences } from '../types';

/**
 * What `window.CookieConsent` answers: `valid` is `validConsent()`,
 * `preferences` is `getUserPreferences()`.
 */
export interface CookieConsentInput {
  valid: boolean;
  preferences: UserPreferences;
}

/**
 * Example CookieConsent states for the categories of the CookieConsent docs:
 * `necessary` (read-only), `analytics` and `ads`.
 */

/**
 * Accept all - the visitor clicked "Accept all"
 */
export const acceptAll: CookieConsentInput = {
  valid: true,
  preferences: {
    acceptType: 'all',
    acceptedCategories: ['necessary', 'analytics', 'ads'],
    rejectedCategories: [],
  },
};

/**
 * Reject all - only the read-only necessary category stays accepted
 */
export const rejectAll: CookieConsentInput = {
  valid: true,
  preferences: {
    acceptType: 'necessary',
    acceptedCategories: ['necessary'],
    rejectedCategories: ['analytics', 'ads'],
  },
};

/**
 * Analytics only - the visitor saved a custom choice without ads
 */
export const analyticsOnly: CookieConsentInput = {
  valid: true,
  preferences: {
    acceptType: 'custom',
    acceptedCategories: ['necessary', 'analytics'],
    rejectedCategories: ['ads'],
  },
};

/**
 * Custom category - the site configures a functionality category
 */
export const customCategory: CookieConsentInput = {
  valid: true,
  preferences: {
    acceptType: 'custom',
    acceptedCategories: ['necessary', 'functionality'],
    rejectedCategories: ['analytics', 'ads'],
  },
};

/**
 * Uppercase category - the site names its ads category `Ads`; it maps like
 * analyticsOnly
 */
export const uppercaseCategory: CookieConsentInput = {
  valid: true,
  preferences: {
    acceptType: 'custom',
    acceptedCategories: ['necessary', 'analytics'],
    rejectedCategories: ['Ads'],
  },
};

/**
 * No choice - opt-in mode before the visitor decides: no valid consent and
 * both lists empty
 */
export const noChoice: CookieConsentInput = {
  valid: false,
  preferences: {
    acceptedCategories: [],
    rejectedCategories: [],
  },
};

/**
 * Opt-out defaults - opt-out mode before the visitor decides: the enabled
 * categories count as accepted, but the consent is not valid
 */
export const optOutDefaults: CookieConsentInput = {
  valid: false,
  preferences: {
    acceptedCategories: ['necessary', 'analytics', 'ads'],
    rejectedCategories: [],
  },
};
