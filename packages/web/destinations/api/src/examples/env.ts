import type { Env } from '../types';

/**
 * Example environment configurations for API destination
 *
 * These environments provide standardized mock structures for testing
 * and development without requiring external dependencies.
 */

// Simple no-op function for mocking
const noop = () => {};

// `sendWeb` has a generic, transport-conditional return type that a concrete
// no-op cannot express; widen the placeholder to the env's function slot.
// Tests and simulation replace this with their own capturing mock.
const widen = <T>(value: unknown): T => value as T;

export const init: Env | undefined = {
  // Environment before initialization (sendWeb not configured yet)
  sendWeb: undefined,
};

export const push: Env = {
  // Standard mock environment for testing
  sendWeb: widen<Env['sendWeb']>(noop),
};

/**
 * Simulation tracking paths
 * Specifies which function calls to track during simulation
 */
export const simulation = [
  'call:sendWeb', // Track sendWeb function calls
];

// Future: error scenarios (v2)
// export const error: Env = { ... };
