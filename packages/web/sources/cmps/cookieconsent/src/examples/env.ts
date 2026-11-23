import type { Elb, Logger } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import type { CookieConsentAPI, CookieConsentWindow, Env } from '../types';
import type { CookieConsentInput } from './inputs';

/**
 * Example environment for CookieConsent source testing: mock structures for
 * consent handling without a real browser or the CookieConsent library.
 */

// Simple no-op function for mocking
const noop = () => {};

/**
 * Whether a value is a CookieConsent input: `valid` and the two category
 * lists of `preferences`.
 */
export function isCookieConsentInput(
  value: unknown,
): value is CookieConsentInput {
  if (!isObject(value) || typeof value.valid !== 'boolean') return false;
  const { preferences } = value;
  if (!isObject(preferences)) return false;
  const isList = (list: unknown) =>
    Array.isArray(list) && list.every((item) => typeof item === 'string');
  return (
    isList(preferences.acceptedCategories) &&
    isList(preferences.rejectedCategories)
  );
}

/**
 * The mocked `window.CookieConsent`: `validConsent()` answers `valid`, and
 * `getUserPreferences()` a copy of `preferences`, as the library returns a
 * deep copy.
 */
export const createCookieConsentApi = (
  input: CookieConsentInput,
): CookieConsentAPI => ({
  validConsent: () => input.valid,
  getUserPreferences: () => ({
    ...input.preferences,
    acceptedCategories: [...input.preferences.acceptedCategories],
    rejectedCategories: [...input.preferences.rejectedCategories],
  }),
});

/**
 * Create a properly typed elb/push function mock that returns a promise with PushResult
 */
export const createMockElbFn = (): Elb.Fn => {
  const fn: Elb.Fn = () => Promise.resolve({ ok: true });
  return fn;
};

/**
 * Simple no-op logger for demo purposes
 */
export const noopLogger: Logger.Instance = {
  error: noop,
  warn: noop,
  info: noop,
  debug: noop,
  throw: (message: string | Error) => {
    throw typeof message === 'string' ? new Error(message) : message;
  },
  json: noop,
  mask: (text: string) => text,
  scope: () => noopLogger,
};

/**
 * Create a mock window, with CookieConsent loaded when an input is given.
 */
export const createMockWindow = (
  input?: CookieConsentInput,
): CookieConsentWindow => ({
  CookieConsent: input ? createCookieConsentApi(input) : undefined,
  addEventListener: noop,
  removeEventListener: noop,
});

/**
 * Standard mock environment for testing the CookieConsent source
 */
export const mockEnv: Env = {
  get push() {
    return createMockElbFn();
  },
  get command() {
    return createMockElbFn();
  },
  get elb() {
    return createMockElbFn();
  },
  get window() {
    return createMockWindow();
  },
  logger: noopLogger,
};
