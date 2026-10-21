import type { Env, TTQ } from '../types';

const noop = () => {};

/** Build a fresh mock ttq: each call returns a new object so tests can mutate independently. */
function makeMockTTQ(): TTQ {
  return Object.assign(() => {}, {
    load: noop,
    page: noop,
    track: noop,
    identify: noop,
    enableCookie: noop,
    disableCookie: noop,
    methods: [
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
    ],
    _i: {},
    loaded: true,
  });
}

/** Minimal web env: window has a mock ttq. */
function makeEnv(): Env {
  return {
    window: {
      ttq: makeMockTTQ(),
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
  'call:window.ttq.load',
  'call:window.ttq.track',
  'call:window.ttq.identify',
  'call:window.ttq.page',
  'call:window.ttq.enableCookie',
  'call:window.ttq.disableCookie',
];
