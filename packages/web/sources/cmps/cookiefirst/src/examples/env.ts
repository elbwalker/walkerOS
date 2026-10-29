import type { Source, Elb, Logger } from '@walkeros/core';
import type { CookieFirstAPI, CookieFirstConsent } from '../types';

/**
 * Example environment configurations for CookieFirst source testing.
 *
 * These provide mock structures for testing consent handling
 * without requiring a real browser environment.
 */

// Simple no-op function for mocking
const noop = () => {};

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
  scope: () => noopLogger,
};

/**
 * Minimal window surface the CookieFirst source touches: the CookieFirst
 * global plus event registration.
 */
type MockCookieFirstWindow = Partial<Window> & { CookieFirst: CookieFirstAPI };

/**
 * Environment interface for CookieFirst source. Its window is the mock's own
 * narrowed shape, so the mock satisfies it directly.
 */
interface CookieFirstEnv extends Source.BaseEnv {
  window?: MockCookieFirstWindow;
}

/**
 * Create a mock CookieFirst API object
 */
export const createMockCookieFirstAPI = (
  consent: CookieFirstConsent | null = null,
): CookieFirstAPI => ({
  consent,
});

/**
 * Create a mock window object with CookieFirst
 */
export const createMockWindow = (
  consent: CookieFirstConsent | null = null,
): MockCookieFirstWindow => ({
  CookieFirst: createMockCookieFirstAPI(consent),
  addEventListener: noop,
  removeEventListener: noop,
});

/**
 * Standard mock environment for testing CookieFirst source
 *
 * Use this for testing consent handling without requiring
 * a real browser environment.
 */
export const mockEnv: CookieFirstEnv = {
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
