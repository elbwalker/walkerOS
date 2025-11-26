import type { Env } from '../types';
import type { Logger } from '@walkeros/core';

/**
 * Example environment configurations for source demo
 */

const noop = async () => ({
  ok: true,
  successful: [],
  queued: [],
  failed: [],
});

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

export const init: Env | undefined = undefined;

export const push: Env = {
  push: noop as Env['push'],
  command: noop as Env['command'],
  elb: noop as Env['elb'],
  logger: noopLogger,
};

/**
 * Simulation tracking paths
 */
export const simulation = ['call:elb'];
