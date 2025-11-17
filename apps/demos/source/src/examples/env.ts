import type { Env } from '../types';

/**
 * Example environment configurations for source demo
 */

const noop = async () => ({
  ok: true,
  successful: [],
  queued: [],
  failed: [],
});

export const init: Env | undefined = undefined;

export const push: Env = {
  push: noop as Env['push'],
  command: noop as Env['command'],
  elb: noop as Env['elb'],
};

/**
 * Simulation tracking paths
 */
export const simulation = ['call:elb'];
