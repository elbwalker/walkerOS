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
  const fn = (() =>
    Promise.resolve({
      ok: true,
    })) as Elb.Fn;
  return fn;
};

// Simple no-op logger for demo purposes
const noopLogger: Logger.Instance = {
  error: noop,
  info: noop,
  debug: noop,
  throw: (message: string | Error) => {
    throw typeof message === 'string' ? new Error(message) : message;
  },
  scope: () => noopLogger,
};

/**
 * Environment interface for dataLayer source
 */
interface DataLayerEnv extends Source.BaseEnv {
  window?: typeof window;
}

/**
 * Mock window object with dataLayer array
 */
const createMockWindow = () => ({
  dataLayer: [] as unknown[],
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
    return createMockWindow() as unknown as typeof window;
  },
  logger: noopLogger,
};
