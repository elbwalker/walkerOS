import type { Env } from '../types';

/**
 * Example environment configurations for PiwikPro destination
 *
 * These environments provide standardized mock structures for testing
 * and development without requiring external dependencies.
 */

export const init: Env | undefined = {
  window: {
    // _paq absent: init() is expected to install the queue.
  },
};

export const push: Env = {
  window: {
    _paq: [],
  },
};

/**
 * Simulation tracking paths
 * Specifies which function calls to track during simulation
 */
export const simulation = [
  'call:window._paq.push', // Track _paq.push calls
];
