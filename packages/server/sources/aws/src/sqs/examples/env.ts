import type { Env } from '../types';
import type { Elb, Logger } from '@walkeros/core';

/**
 * Example environment for the AWS SQS source.
 *
 * Tests substitute the real SDK via `jest.mock('@aws-sdk/client-sqs')` and
 * `jest.mock('@aws-sdk/client-sns')`, which is the canonical pattern: imports
 * of those modules get replaced module-wide, no env-injection plumbing
 * required at the call site.
 *
 * The `simulation` list documents which SDK identifiers the source touches
 * during a simulated run, used by the simulator to know what to stub.
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
 * Standard mock environment for the SQS source.
 *
 * AWS SDK constructors are intentionally absent: the canonical pattern is
 * module-level `jest.mock('@aws-sdk/client-sqs')` and -sns, not env-injection.
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

/**
 * No recorded calls. The SQS client is not part of this mock env (tests
 * substitute the SDK module-wide), so a path such as `AWS.SQSClient` never
 * resolved here. Recording receive and delete calls needs an `AWS.SQSClient`
 * mock in `push`, which would bypass those module mocks.
 */
export const simulation: string[] = [];
