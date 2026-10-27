import { DEFAULT_CONSENT_MODE_MAPPING } from '@walkeros/web-core';
import {
  DEFAULT_CONSENT_MAPPING,
  resolveConsentMapping,
  buildDefaultConsent,
  hasConsentSignal,
} from '../shared/consent';
import type { Settings } from '../types';

describe('shared/consent', () => {
  it('resolves the default mapping when como is true/undefined', () => {
    expect(resolveConsentMapping({})).toEqual(DEFAULT_CONSENT_MAPPING);
    expect(resolveConsentMapping({ como: true })).toEqual(
      DEFAULT_CONSENT_MAPPING,
    );
  });

  it('returns undefined when como is false', () => {
    expect(resolveConsentMapping({ como: false })).toBeUndefined();
  });

  it('returns a custom mapping verbatim', () => {
    const custom = { marketing: 'ad_storage' };
    expect(resolveConsentMapping({ como: custom })).toEqual(custom);
  });

  it('uses the shared consent mode default', () => {
    expect(DEFAULT_CONSENT_MAPPING).toBe(DEFAULT_CONSENT_MODE_MAPPING);
  });

  it('builds an all-denied default object', () => {
    expect(buildDefaultConsent({})).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
  });

  it('adds wait_for_update when como_advanced is set', () => {
    expect(buildDefaultConsent({ como_advanced: true })).toMatchObject({
      wait_for_update: 500,
    });
    expect(buildDefaultConsent({ como_advanced: 250 })).toMatchObject({
      wait_for_update: 250,
    });
  });

  it('returns undefined default when como is false', () => {
    expect(buildDefaultConsent({ como: false })).toBeUndefined();
  });

  it('detects a consent signal from config.consent or como_advanced only', () => {
    expect(hasConsentSignal({ marketing: true }, {})).toBe(true);
    expect(hasConsentSignal(undefined, { como_advanced: true })).toBe(true);
    expect(hasConsentSignal(undefined, {})).toBe(false);
    expect(hasConsentSignal({}, {})).toBe(false); // empty object is not a signal
  });
});
