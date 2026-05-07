import type { Env } from '../types';
import type { Elb, Logger } from '@walkeros/core';

/**
 * Example environment for the Pub/Sub pull source.
 *
 * Tests substitute the real SDK via `jest.mock('@google-cloud/pubsub')`,
 * which is the recommended pattern: imports of `@google-cloud/pubsub` get
 * replaced module-wide, no env-injection plumbing required at the call site.
 *
 * The `simulation` list documents which globals the source touches during a
 * simulated run, used by the simulator to know what to stub.
 */

const noopFn = (): void => undefined;
const noopLogger: Logger.Instance = {
  error: noopFn,
  warn: noopFn,
  info: noopFn,
  debug: noopFn,
  throw: (message: string | Error) => {
    throw typeof message === 'string' ? new Error(message) : message;
  },
  json: noopFn,
  scope: () => noopLogger,
};

const createMockElbFn = (): Elb.Fn => {
  const fn: Elb.Fn = () => Promise.resolve({ ok: true });
  return fn;
};

/**
 * Standard mock environment for the pull source.
 *
 * `PubSub` is intentionally absent: the canonical pattern is module-level
 * `jest.mock('@google-cloud/pubsub')`, not env-injection.
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

export const simulation = ['PubSub'];
