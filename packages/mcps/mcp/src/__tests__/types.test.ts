import { ApiError } from '@walkeros/cli';
import { isAccessRefusal, isAuthenticationError } from '../types.js';
import { CodedError } from './support/coded-error.js';

describe('isAuthenticationError', () => {
  it.each([
    [
      'a 401 UNAUTHORIZED answer',
      new ApiError('Authentication required', {
        code: 'UNAUTHORIZED',
        status: 401,
      }),
    ],
    [
      'an invalid or expired token',
      new ApiError('Invalid or expired API token', { code: 'UNAUTHORIZED' }),
    ],
    [
      'a 401 whose code names the reason',
      new ApiError('Sign in to comment', {
        code: 'SIGN_IN_REQUIRED',
        status: 401,
      }),
    ],
    [
      'a request refused locally for want of a stored login',
      new ApiError('Not authenticated. Run `walkeros auth login` first.', {
        code: 'UNAUTHORIZED',
      }),
    ],
  ])('is true for %s', (_label, error) => {
    expect(isAuthenticationError(error)).toBe(true);
  });

  it.each([
    [
      'a 403 role refusal',
      new ApiError('Requires member role or higher', {
        code: 'FORBIDDEN',
        status: 403,
      }),
    ],
    [
      'a role refusal from the hosted door',
      new CodedError('Requires member role or higher', 'FORBIDDEN'),
    ],
    [
      'a 403 scope refusal',
      new ApiError('This token cannot write', {
        code: 'INSUFFICIENT_SCOPE',
        status: 403,
      }),
    ],
    [
      'a scope refusal from the hosted door',
      new CodedError(
        'The scope "write" is required to call createProject',
        'INSUFFICIENT_SCOPE',
      ),
    ],
    [
      'a feature gate',
      new ApiError('frames is not available on your current plan', {
        code: 'FEATURE_NOT_AVAILABLE',
        status: 403,
      }),
    ],
    ['a plain error worded like a login failure', new Error('Unauthorized')],
    ['a plain error', new Error('boom')],
    ['a non-error value', 'UNAUTHORIZED'],
  ])('is false for %s', (_label, error) => {
    expect(isAuthenticationError(error)).toBe(false);
  });
});

describe('isAccessRefusal', () => {
  it.each([
    [
      'a 403 role refusal',
      new ApiError('Requires member role or higher', {
        code: 'FORBIDDEN',
        status: 403,
      }),
    ],
    [
      'a role refusal from the hosted door',
      new CodedError('Requires member role or higher', 'FORBIDDEN'),
    ],
    [
      'a scope refusal from the hosted door',
      new CodedError(
        'The scope "write" is required to call createProject',
        'INSUFFICIENT_SCOPE',
      ),
    ],
    [
      'a 403 whose code names another reason',
      new ApiError('Token is bound to another flow', {
        code: 'FORBIDDEN_FLOW',
        status: 403,
      }),
    ],
  ])('is true for %s', (_label, error) => {
    expect(isAccessRefusal(error)).toBe(true);
  });

  it.each([
    [
      'a 401',
      new ApiError('Authentication required', {
        code: 'UNAUTHORIZED',
        status: 401,
      }),
    ],
    ['a code-less error worded as a refusal', new Error('Forbidden')],
    ['a non-error value', 'FORBIDDEN'],
  ])('is false for %s', (_label, error) => {
    expect(isAccessRefusal(error)).toBe(false);
  });
});
