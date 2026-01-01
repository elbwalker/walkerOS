import type { Env } from '../types';

/**
 * Example environment configurations for processor demo
 */

const noop = () => {};

export const init: Env | undefined = {
  log: undefined,
};

export const push: Env = {
  log: Object.assign(noop, {}) as Env['log'],
};

/**
 * Simulation tracking paths
 */
export const simulation = ['call:log'];
