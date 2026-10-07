import {
  errorHint,
  featureDenialHint,
  isFeatureDenial,
} from '../../tools/feature-gate.js';
import { AUTH_HINT } from '../../types.js';
import { CodedError } from '../support/coded-error.js';

describe('feature gate', () => {
  it('recognises a denial by its code, not its wording', () => {
    expect(
      isFeatureDenial(new CodedError('anything', 'FEATURE_NOT_AVAILABLE')),
    ).toBe(true);
    expect(
      isFeatureDenial(new Error('hub is not available on your current plan')),
    ).toBe(false);
    expect(isFeatureDenial('FEATURE_NOT_AVAILABLE')).toBe(false);
  });

  it.each(['hub', 'frames'] as const)(
    'names the feature %s in the hint',
    (feature) => {
      expect(featureDenialHint(feature)).toContain(`"${feature}"`);
    },
  );

  // The second message reads like a login failure: the hint follows the code,
  // so its wording never sends a denied caller to log in again.
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

  it.each([
    ['a role refusal', 'Requires member role or higher', 'FORBIDDEN'],
    [
      'a scope refusal',
      'This token lacks the write scope',
      'INSUFFICIENT_SCOPE',
    ],
    ['a role refusal worded as a login failure', 'Forbidden', 'FORBIDDEN'],
  ])('adds no hint for %s', (_label, message, code) => {
    expect(
      errorHint(new CodedError(message, code), 'hub', 'find ids'),
    ).toBeUndefined();
  });

  it('adds the discovery hint on NOT_FOUND and nothing otherwise', () => {
    expect(
      errorHint(
        new CodedError('Release not found', 'NOT_FOUND'),
        'hub',
        'find ids',
      ),
    ).toBe('find ids');
    expect(errorHint(new Error('boom'), 'hub', 'find ids')).toBeUndefined();
  });
});
