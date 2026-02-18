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
  const fn = (() =>
    Promise.resolve({
      ok: true,
    })) as Elb.Fn;
  return fn;
};

/**
 * Simple no-op logger for demo purposes
 */
export const noopLogger: Logger.Instance = {
  error: noop,
  info: noop,
  debug: noop,
  throw: (message: string | Error) => {
    throw typeof message === 'string' ? new Error(message) : message;
  },
  scope: () => noopLogger,
};

/**
 * Environment interface for CookieFirst source
 */
interface CookieFirstEnv extends Source.BaseEnv {
  window?: typeof window;
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
): Partial<Window> & { CookieFirst: CookieFirstAPI } => ({
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
    return createMockWindow() as unknown as typeof window;
  },
  logger: noopLogger,
};
