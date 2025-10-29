import type { Env } from '../types';
import type { Elb } from '@walkeros/core';

/**
 * Example environment configurations for GCP Cloud Function source
 *
 * These environments provide standardized mock structures for testing
 * HTTP request handling without requiring actual cloud function deployment.
 */

// Create a properly typed elb/push/command function that returns a promise with PushResult
const createMockElbFn = (): Elb.Fn => {
  const fn = (() =>
    Promise.resolve({
      ok: true,
      successful: [],
      queued: [],
      failed: [],
    })) as Elb.Fn;
  return fn;
};

/**
 * Standard mock environment for testing cloud function source
 *
 * Use this for testing HTTP event ingestion and request/response handling
 * without requiring a real GCP Cloud Function environment.
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
};
