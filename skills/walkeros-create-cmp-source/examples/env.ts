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
  warn: noop,
  info: noop,
  debug: noop,
  throw: (message: string | Error) => {
    throw typeof message === 'string' ? new Error(message) : message;
  },
  json: noop,
  scope: () => noopLogger,
};

/** Generic CMP API -- adapt for your CMP's window object shape */
export const createMockCmpAPI = (consent: CmpConsent | null = null) => ({
  consent,
});

/**
 * Minimal window surface the CMP source touches: the CMP global plus event
 * registration. Typing the env window to this narrowed shape (instead of the
 * global `typeof window`) lets the mock satisfy it directly, with no
 * `as unknown as typeof window` cast.
 */
interface MockCmpWindow {
  [globalName: string]: ReturnType<typeof createMockCmpAPI> | unknown;
  addEventListener: (event: string, handler: (e: Event) => void) => void;
  removeEventListener: (event: string, handler: (e: Event) => void) => void;
}

/** Generic mock window with CMP API */
export const createMockWindow = (
  consent: CmpConsent | null = null,
  globalName = 'CmpName',
): MockCmpWindow => ({
  [globalName]: createMockCmpAPI(consent),
  addEventListener: noop,
  removeEventListener: noop,
});

interface CmpEnv extends Source.BaseEnv {
  window?: MockCmpWindow;
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
    return createMockWindow();
  },
  logger: noopLogger,
};
