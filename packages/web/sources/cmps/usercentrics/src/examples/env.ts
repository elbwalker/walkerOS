import type { Elb, Logger } from '@walkeros/core';

/**
 * Example environment configurations for Usercentrics source testing.
 */

const noop = () => {};

/**
 * Create a properly typed elb/push function mock
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
