import type { CookiebotAPI } from '../types';

/**
 * Example `window.Cookiebot` states.
 *
 * Shapes follow what Cookiebot's uc.js sets: the four category booleans are
 * always present, `method` is 'explicit', 'implied' or null, and `stamp`
 * identifies the stored consent.
 */

/**
 * Full consent - the visitor clicked "Allow all"
 */
export const fullConsent: CookiebotAPI = {
  consented: true,
  declined: false,
  hasResponse: true,
  consent: {
    stamp: 'example-stamp-full',
    necessary: true,
    preferences: true,
    statistics: true,
    marketing: true,
    method: 'explicit',
  },
};

/**
 * Partial consent - preferences and statistics allowed, marketing denied
 */
export const partialConsent: CookiebotAPI = {
  consented: true,
  declined: false,
  hasResponse: true,
  consent: {
    stamp: 'example-stamp-partial',
    necessary: true,
    preferences: true,
    statistics: true,
    marketing: false,
    method: 'explicit',
  },
};

/**
 * Necessary only - the visitor clicked "Use necessary cookies only", or
 * withdrew an earlier consent
 */
export const necessaryOnly: CookiebotAPI = {
  consented: false,
  declined: true,
  hasResponse: true,
  consent: {
    stamp: 'example-stamp-necessary',
    necessary: true,
    preferences: false,
    statistics: false,
    marketing: false,
    method: 'explicit',
  },
};

/**
 * Implied consent - Cookiebot consented on its own, for example for a visitor
 * outside the regions where the site asks for consent
 */
export const impliedConsent: CookiebotAPI = {
  consented: true,
  declined: false,
  hasResponse: true,
  consent: {
    stamp: '-1',
    necessary: true,
    preferences: true,
    statistics: true,
    marketing: true,
    method: 'implied',
  },
};

/**
 * No response - a first visit while the banner is still open
 */
export const noResponse: CookiebotAPI = {
  consented: false,
  declined: false,
  hasResponse: false,
  consent: {
    stamp: '0',
    necessary: true,
    preferences: false,
    statistics: false,
    marketing: false,
    method: null,
  },
};

/**
 * Uppercase method - full consent with the method in a different casing
 */
export const uppercaseMethod: CookiebotAPI = {
  ...fullConsent,
  consent: { ...fullConsent.consent, method: 'EXPLICIT' },
};
