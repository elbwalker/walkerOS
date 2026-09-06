import {
  errorHint,
  featureDenialHint,
  isFeatureDenial,
} from '../../tools/feature-gate.js';
import { AUTH_HINT } from '../../types.js';

class CodedError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

describe('feature gate', () => {
  it('recognises a denial by its code, not its wording', () => {
    expect(
      isFeatureDenial(new CodedError('anything', 'FEATURE_NOT_AVAILABLE')),
    ).toBe(true);
    expect(
      isFeatureDenial(
        new CodedError('hub is not available on your current plan'),
      ),
    ).toBe(false);
    expect(isFeatureDenial('FEATURE_NOT_AVAILABLE')).toBe(false);
  });

  it.each(['hub', 'frames'] as const)(
    'names the feature %s in the hint',
    (feature) => {
      expect(featureDenialHint(feature)).toContain(`"${feature}"`);
    },
  );

  // The second message is the one that proves the ordering: `isAuthError`
  // answers to the word "forbidden" anywhere in a message, so a denial worded
  // that way reaches the auth hint the moment the two checks swap places.
  it.each([
    ['reads as a plan limit', 'frames is not available on your current plan'],
    ['also reads as an auth failure', 'Forbidden'],
  ])(
    'picks the denial hint over the auth hint when the message %s',
    (_label, message) => {
      const error = new CodedError(message, 'FEATURE_NOT_AVAILABLE');
      expect(errorHint(error, 'frames', 'find ids')).toBe(
        featureDenialHint('frames'),
      );
    },
  );

  it('keeps the auth hint for an auth failure', () => {
    expect(
      errorHint(
        new CodedError('Unauthorized', 'UNAUTHORIZED'),
        'hub',
        'find ids',
      ),
    ).toBe(AUTH_HINT);
  });

  it('adds the discovery hint on NOT_FOUND and nothing otherwise', () => {
    expect(
      errorHint(
        new CodedError('Release not found', 'NOT_FOUND'),
        'hub',
        'find ids',
      ),
    ).toBe('find ids');
    expect(
      errorHint(new CodedError('boom'), 'hub', 'find ids'),
    ).toBeUndefined();
  });
});
