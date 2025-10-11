import type { Env } from '../types';

/**
 * Example environment configurations for PiwikPro destination
 *
 * These environments provide standardized mock structures for testing
 * and development without requiring external dependencies.
 */

export const init: Env | undefined = {
  window: {
    _paq: undefined as unknown as Env['window']['_paq'],
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

export const standard: Env = {
  window: {
    _paq: [] as unknown[],
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
