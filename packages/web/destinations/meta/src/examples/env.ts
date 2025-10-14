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
  // Environment before initialization (fbq not loaded yet)
  window: {
    fbq: undefined as unknown as Env['window']['fbq'],
    _fbq: undefined,
  },
  document: {
    createElement: () =>
      ({
        src: '',
        async: false,
        setAttribute: () => {},
        removeAttribute: () => {},
      }) as unknown as Element,
    head: { appendChild: () => {} },
  },
};

export const push: Env = {
  // Standard mock environment for testing
  window: {
    fbq: Object.assign(noop, {
      // Add Meta Pixel specific properties
      callMethod: noop,
      queue: [] as unknown[],
      push: noop,
      loaded: true,
      version: '2.0',
    }) as unknown as Env['window']['fbq'],
    _fbq: Object.assign(noop, {
      callMethod: noop,
      queue: [] as unknown[],
      push: noop,
      loaded: true,
      version: '2.0',
    }) as unknown as Env['window']['_fbq'],
  },
  document: {
    createElement: () =>
      ({
        src: '',
        async: false,
        setAttribute: () => {},
        removeAttribute: () => {},
      }) as unknown as Element,
    head: { appendChild: () => {} },
  },
};

// Future: error scenarios (v2)
// export const error: Env = { ... };
