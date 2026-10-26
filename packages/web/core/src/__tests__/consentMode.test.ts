import {
  DEFAULT_CONSENT_MODE_MAPPING,
  consentModeParameters,
  resolveConsentMode,
} from '../consentMode';

describe('consentMode', () => {
  test('the default maps measurement to analytics and ads to marketing', () => {
    expect(DEFAULT_CONSENT_MODE_MAPPING).toEqual({
      marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
      analytics: ['analytics_storage'],
    });
  });

  test('lists every parameter of a mapping once', () => {
    expect(
      consentModeParameters({
        marketing: ['ad_storage', 'ad_user_data'],
        analytics: 'analytics_storage',
        stats: ['analytics_storage'],
      }),
    ).toEqual(['ad_storage', 'ad_user_data', 'analytics_storage']);
  });

  test('resolves every mapped parameter from the consent state', () => {
    expect(
      resolveConsentMode(DEFAULT_CONSENT_MODE_MAPPING, {
        analytics: true,
        marketing: false,
      }),
    ).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    });
  });

  test('treats a group missing from the state as denied', () => {
    expect(
      resolveConsentMode(DEFAULT_CONSENT_MODE_MAPPING, { marketing: true }),
    ).toMatchObject({ ad_storage: 'granted', analytics_storage: 'denied' });
  });

  test('ignores a functional grant under the default mapping', () => {
    expect(
      resolveConsentMode(DEFAULT_CONSENT_MODE_MAPPING, {
        functional: true,
        analytics: false,
      }),
    ).toMatchObject({ analytics_storage: 'denied' });
  });

  test.each([
    [{ analytics: true, functional: true }, 'granted'],
    [{ analytics: true, functional: false }, 'denied'],
    [{ analytics: false, functional: true }, 'denied'],
    [{ functional: true, analytics: false }, 'denied'],
    [{ analytics: true }, 'denied'],
  ])(
    'grants a parameter only when every group mapped to it is granted: %j',
    (state, expected) => {
      const mapping = {
        analytics: 'analytics_storage',
        functional: 'analytics_storage',
      };
      expect(resolveConsentMode(mapping, state)).toEqual({
        analytics_storage: expected,
      });
    },
  );

  test('limits the result to the parameters of the changed groups', () => {
    expect(
      resolveConsentMode(
        DEFAULT_CONSENT_MODE_MAPPING,
        { analytics: true, marketing: true },
        { marketing: true },
      ),
    ).toEqual({
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    });
  });

  test('decides the parameter of a changed group from the whole state', () => {
    const mapping = {
      analytics: 'analytics_storage',
      functional: 'analytics_storage',
    };
    expect(
      resolveConsentMode(
        mapping,
        { analytics: false, functional: true },
        { functional: true },
      ),
    ).toEqual({ analytics_storage: 'denied' });
  });

  test('ignores consent keys that are names of object built-ins', () => {
    expect(
      resolveConsentMode(
        DEFAULT_CONSENT_MODE_MAPPING,
        { constructor: true, toString: true },
        { constructor: true, toString: true },
      ),
    ).toEqual({});
  });

  test('resolves nothing for groups the mapping does not name', () => {
    expect(
      resolveConsentMode(
        DEFAULT_CONSENT_MODE_MAPPING,
        { functional: true },
        { functional: true },
      ),
    ).toEqual({});
  });
});
