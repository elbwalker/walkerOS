import type { Env } from '../types';

/**
 * Example environment configurations for API destination
 *
 * These environments provide standardized mock structures for testing
 * and development without requiring external dependencies.
 */

const sendServer: NonNullable<Env['sendServer']> = () =>
  Promise.resolve({ ok: true });

export const init: Env | undefined = {
  sendServer: undefined,
};

export const push: Env = {
  sendServer,
};

/**
 * Simulation tracking paths
 * Specifies which function calls to track during simulation
 */
export const simulation = ['sendServer'];
