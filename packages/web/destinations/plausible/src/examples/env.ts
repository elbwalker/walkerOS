import { mockScriptDocument } from '@walkeros/web-core/dev';
import type { Env } from '../types';

/**
 * Example environment configurations for Plausible destination
 *
 * These environments provide standardized mock structures for testing
 * and development without requiring external dependencies.
 */

// Simple no-op function for mocking
const noop = () => {};

export const init: Env | undefined = {
  window: {
    // plausible absent: init() is expected to install the stub.
  },
  document: mockScriptDocument(),
};

export const push: Env = {
  window: {
    plausible: Object.assign(noop, {
      // Add queue property for analytics loading pattern
      q: [] as IArguments[],
    }),
  },
  document: mockScriptDocument(),
};

/**
 * Simulation tracking paths
 * Specifies which function calls to track during simulation
 */
export const simulation = [
  'call:window.plausible', // Track plausible function calls
];

// Future: error scenarios (v2)
// export const error: Env = { ... };
