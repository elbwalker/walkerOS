import type { Env } from '../types';

/**
 * Example environment configurations for Snowplow destination
 *
 * These environments provide standardized mock structures for testing
 * and development without requiring external dependencies.
 */

// Simple no-op function for mocking
const noop = () => {};

export const init: Env | undefined = {
  window: {
    snowplow: undefined as unknown as Env['window']['snowplow'],
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

export const push: Env = {
  window: {
    snowplow: Object.assign(noop, {
      q: [],
    }) as unknown as Env['window']['snowplow'],
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

export const simulation = [
  'call:window.snowplow', // Track snowplow function calls
];
