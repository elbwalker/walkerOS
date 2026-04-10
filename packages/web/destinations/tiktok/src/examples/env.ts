import type { Env, TTQ } from '../types';

const noop = () => {};

/** Build a fresh mock ttq — each call returns a new object so tests can mutate independently. */
function makeMockTTQ(): TTQ {
  const fn = (() => {}) as unknown as TTQ;
  fn.load = noop;
  fn.page = noop;
  fn.track = noop;
  fn.identify = noop;
  fn.enableCookie = noop;
  fn.disableCookie = noop;
  fn.methods = [
    'page',
    'track',
    'identify',
    'instances',
    'debug',
    'on',
    'off',
    'once',
    'ready',
    'alias',
    'group',
    'enableCookie',
    'disableCookie',
  ];
  fn._i = {};
  fn.loaded = true;
  return fn;
}

/**
 * Minimal web env — window has a mock ttq. document has the bare minimum
 * for addScript() (createElement + head.appendChild), with no-op
 * implementations so init() can run without a real DOM.
 */
function makeEnv(): Env {
  return {
    window: {
      ttq: makeMockTTQ(),
    },
    document: {
      createElement: () =>
        ({
          src: '',
          async: false,
        }) as unknown as Element,
      head: { appendChild: noop },
    },
  };
}

/**
 * Pre-init env — destination init() call will set up ttq and load the
 * script. Tests receive this as a starting point.
 */
export const init: Env = makeEnv();

/**
 * Post-init env — same shape; the test runner clones this and replaces
 * individual ttq methods with jest.fn() so it can assert on calls.
 */
export const push: Env = makeEnv();

/** Simulation tracking paths for CLI --simulate. */
export const simulation = [
  'call:ttq.load',
  'call:ttq.track',
  'call:ttq.identify',
  'call:ttq.page',
  'call:ttq.enableCookie',
  'call:ttq.disableCookie',
];
