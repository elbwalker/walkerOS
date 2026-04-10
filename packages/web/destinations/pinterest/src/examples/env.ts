import type { Env, Pintrk } from '../types';

/**
 * Example environment configurations for the Pinterest destination.
 *
 * These mock window.pintrk and document, allowing tests to run in a pure
 * Node environment without jsdom and without touching the real Pinterest
 * CDN. Tests replace env.window.pintrk with a jest.fn() spy.
 */

const noop = () => {};

const noopPintrk: Pintrk = Object.assign(noop, {
  queue: [] as unknown[][],
  version: '3.0',
}) as unknown as Pintrk;

/**
 * Pre-init environment — pintrk is not yet on the window.
 * Used to validate the init path that creates the queue function.
 */
export const init: Env = {
  window: {
    pintrk: undefined,
  },
  document: {
    createElement: () => ({
      src: '',
      async: false,
      dataset: {},
      setAttribute: () => {},
      removeAttribute: () => {},
    }),
    head: { appendChild: () => {} },
    getElementsByTagName: () => [
      {
        parentNode: { insertBefore: () => {} },
      },
    ],
    querySelector: () => null,
  },
};

/**
 * Post-init environment — pintrk is available as a spy-able function.
 * Tests clone this and replace `pintrk` with a jest.fn() to record calls.
 */
export const push: Env = {
  window: {
    pintrk: noopPintrk,
  },
  document: {
    createElement: () => ({
      src: '',
      async: false,
      dataset: {},
      setAttribute: () => {},
      removeAttribute: () => {},
    }),
    head: { appendChild: () => {} },
    getElementsByTagName: () => [
      {
        parentNode: { insertBefore: () => {} },
      },
    ],
    querySelector: () => null,
  },
};

/** Simulation tracking paths for CLI --simulate. */
export const simulation = ['call:window.pintrk'];
