import type { Environment } from '../types';

/**
 * Example environment configurations for Plausible destination
 *
 * These environments provide standardized mock structures for testing
 * and development without requiring external dependencies.
 */

// Simple no-op function for mocking
const noop = () => {};

export const env: {
  init?: Environment;
  push: Environment;
  error?: Environment;
} = {
  // Environment before initialization
  init: {
    window: {
      plausible: undefined as unknown as Environment['window']['plausible'],
    },
    document: {
      createElement: () => ({
        src: '',
        dataset: {},
        setAttribute: () => {},
        removeAttribute: () => {},
      }),
      head: { appendChild: () => {} },
      querySelector: () => null,
    },
  },

  // Standard environment for push operations
  push: {
    window: {
      plausible: Object.assign(noop, {
        // Add queue property for analytics loading pattern
        q: [] as IArguments[],
      }) as unknown as Environment['window']['plausible'],
    },
    document: {
      createElement: () => ({
        src: '',
        dataset: {},
        setAttribute: () => {},
        removeAttribute: () => {},
      }),
      head: { appendChild: () => {} },
      querySelector: () => null,
    },
  },

  // Future: error scenarios (v2)
  // error: { ... }
};
