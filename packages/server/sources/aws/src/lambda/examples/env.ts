import type { Env } from '../types';
import type { Elb, Logger } from '@walkeros/core';

/**
 * Example environment configurations for AWS Lambda source
 *
 * These environments provide standardized mock structures for testing
 * Lambda event handling without requiring actual Lambda deployment.
 */

// Create a properly typed elb/push/command function that returns a promise with PushResult
const createMockElbFn = (): Elb.Fn => {
  const fn = (() =>
    Promise.resolve({
      ok: true,
    })) as Elb.Fn;
  return fn;
};

// Simple no-op logger for demo purposes
const noopFn = () => {};
const noopLogger: Logger.Instance = {
  error: noopFn,
  info: noopFn,
  debug: noopFn,
  throw: (message: string | Error) => {
    throw typeof message === 'string' ? new Error(message) : message;
  },
  scope: () => noopLogger,
};

/**
 * Standard mock environment for testing Lambda source
 *
 * Use this for testing Lambda event ingestion and request/response handling
 * without requiring a real AWS Lambda environment.
 */
export const push: Env = {
  get push() {
    return createMockElbFn();
  },
  get command() {
    return createMockElbFn();
  },
  get elb() {
    return createMockElbFn();
  },
  logger: noopLogger,
};
