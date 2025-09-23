import type { Environment } from '../types';

/**
 * Example environment configurations for Gtag destination
 *
 * These environments provide standardized mock structures for testing
 * and development without requiring external dependencies.
 */

// Simple no-op function for mocking
const noop = () => {};

export const init: Environment | undefined = {
  window: {
    gtag: undefined as unknown as Environment['window']['gtag'],
    dataLayer: [],
  },
  document: {
    createElement: () => ({
      src: '',
      setAttribute: () => {},
      removeAttribute: () => {},
    }),
    head: { appendChild: () => {} },
  },
};

export const standard: Environment = {
  window: {
    gtag: Object.assign(noop, {
      // Add any gtag-specific properties if needed
    }) as unknown as Environment['window']['gtag'],
    dataLayer: [] as unknown[],
  },
  document: {
    createElement: () => ({
      src: '',
      setAttribute: () => {},
      removeAttribute: () => {},
    }),
    head: { appendChild: () => {} },
  },
};
