import type { Source, Elb, Logger } from '@walkeros/core';
import type { CmpConsent } from './inputs';

/**
 * Mock environment factories for CMP source testing.
 *
 * Create this file BEFORE implementation (Phase 2).
 * Adapt createMockCmpAPI and createMockWindow for your CMP's
 * window object shape and API interface.
 */

const noop = () => {};

/** Create a properly typed elb/push function mock */
export const createMockElbFn = (): Elb.Fn => {
  const fn = (() => Promise.resolve({ ok: true })) as Elb.Fn;
  return fn;
};

/** Simple no-op logger for demo purposes */
export const noopLogger: Logger.Instance = {
  error: noop,
  info: noop,
  debug: noop,
  throw: (message: string | Error) => {
    throw typeof message === 'string' ? new Error(message) : message;
  },
  scope: () => noopLogger,
};

/** Generic CMP API -- adapt for your CMP's window object shape */
export const createMockCmpAPI = (consent: CmpConsent | null = null) => ({
  consent,
});

/** Generic mock window with CMP API */
export const createMockWindow = (
  consent: CmpConsent | null = null,
  globalName = 'CmpName',
) => ({
  [globalName]: createMockCmpAPI(consent),
  addEventListener: noop,
  removeEventListener: noop,
});

interface CmpEnv extends Source.BaseEnv {
  window?: typeof window;
}

/** Standard mock environment for testing CMP sources */
export const mockEnv: CmpEnv = {
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
