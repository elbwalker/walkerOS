import type { Env } from '../types';

/**
 * Example environment configurations for Matomo destination.
 * Mocks the _paq command queue and DOM elements for testing
 * without requiring real browser or network.
 */

export const init: Env | undefined = {
  window: {
    _paq: undefined as unknown as Env['window']['_paq'],
    location: { href: 'https://www.example.com/page' },
  },
  document: {
    createElement: () => ({
      type: '',
      src: '',
      async: false,
      defer: false,
    }),
    head: { appendChild: () => {} },
  },
};

export const push: Env = {
  window: {
    _paq: [] as unknown[],
    location: { href: 'https://www.example.com/page' },
  },
  document: {
    createElement: () => ({
      type: '',
      src: '',
      async: false,
      defer: false,
    }),
    head: { appendChild: () => {} },
  },
};

/**
 * Simulation tracking paths.
 * Specifies which function calls to track during simulation.
 */
export const simulation = [
  'call:window._paq.push', // Track _paq.push calls
];
