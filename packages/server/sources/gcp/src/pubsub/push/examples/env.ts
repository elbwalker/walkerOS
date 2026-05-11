import type { Env } from '../types';
import type { Elb, Logger } from '@walkeros/core';

/**
 * Example environment for the Pub/Sub push source.
 *
 * Provides a no-op env compatible with `Source.Env` plus an optional
 * verifyOidcToken stub for tests that exercise OIDC verification.
 */

const noopFn = () => {};
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
  const fn = (() => Promise.resolve({ ok: true })) as Elb.Fn;
  return fn;
};

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

export const simulation: string[] = [];
