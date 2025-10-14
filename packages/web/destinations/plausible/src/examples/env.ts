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
    plausible: undefined as unknown as Env['window']['plausible'],
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
};

export const push: Env = {
  window: {
    plausible: Object.assign(noop, {
      // Add queue property for analytics loading pattern
      q: [] as IArguments[],
    }) as unknown as Env['window']['plausible'],
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
};

// Future: error scenarios (v2)
// export const error: Env = { ... };
