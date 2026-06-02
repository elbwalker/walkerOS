import type { Env } from '../types';

/**
 * Example environment configurations for Meta Pixel destination
 *
 * These environments provide standardized mock structures for testing
 * and development without requiring external dependencies.
 */

// Simple no-op function for mocking
const noop = () => {};

export const init: Env | undefined = {
  // Environment before initialization (fbq/_fbq absent until setup() runs)
  window: {},
  document: {
    createElement: () => ({
      src: '',
      async: false,
      setAttribute: () => {},
      removeAttribute: () => {},
    }),
    head: { appendChild: () => {} },
  },
};

export const push: Env = {
  // Standard mock environment for testing
  window: {
    fbq: Object.assign(noop, {
      // Add Meta Pixel specific properties
      callMethod: noop,
      queue: [],
      push: noop,
      loaded: true,
      version: '2.0',
    }),
    _fbq: Object.assign(noop, {
      callMethod: noop,
      queue: [],
      push: noop,
      loaded: true,
      version: '2.0',
    }),
  },
  document: {
    createElement: () => ({
      src: '',
      async: false,
      setAttribute: () => {},
      removeAttribute: () => {},
    }),
    head: { appendChild: () => {} },
  },
};

/**
 * Simulation tracking paths
 * Specifies which function calls to track during simulation
 */
export const simulation = [
  'call:window.fbq', // Track fbq function calls
];

// Future: error scenarios (v2)
// export const error: Env = { ... };
