import type { Source, Elb, Logger } from '@walkeros/core';

/**
 * Example environment configurations for dataLayer source
 *
 * These environments provide standardized mock structures for testing
 * dataLayer interception without requiring a real window object.
 */

// Simple no-op function for mocking
const noop = () => {};

// Create a properly typed elb/push/command function that returns a promise with PushResult
const createMockElbFn = (): Elb.Fn => {
  const fn: Elb.Fn = () => Promise.resolve({ ok: true });
  return fn;
};

// Simple no-op logger for demo purposes
const noopLogger: Logger.Instance = {
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
 * Minimal window surface the dataLayer source touches: the dataLayer array
 * plus event registration.
 */
interface MockDataLayerWindow {
  dataLayer: unknown[];
  addEventListener: () => void;
  removeEventListener: () => void;
}

/**
 * Environment interface for dataLayer source. Its window is the mock's own
 * narrowed shape, so the mock satisfies it directly.
 */
interface DataLayerEnv extends Source.BaseEnv {
  window?: MockDataLayerWindow;
}

/**
 * Mock window object with dataLayer array
 */
const createMockWindow = (): MockDataLayerWindow => ({
  dataLayer: [],
  addEventListener: noop,
  removeEventListener: noop,
});

/**
 * Standard mock environment for testing dataLayer source
 *
 * Use this for testing dataLayer.push interception and event transformation
 * without requiring a real browser environment.
 */
export const push: DataLayerEnv = {
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
