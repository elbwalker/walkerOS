import type { Env } from '../types';

/**
 * Example environment configurations for Gtag destination
 *
 * These environments provide standardized mock structures for testing
 * and development without requiring external dependencies.
 */

// Simple no-op function for mocking
const noop = () => {};

export const init: Env | undefined = {
  window: {
    // gtag absent: initializeGtag() installs it during init.
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

export const push: Env = {
  window: {
    gtag: Object.assign(noop, {
      // Add any gtag-specific properties if needed
    }),
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

export const simulation = [
  'call:window.gtag', // Track gtag function calls
];
