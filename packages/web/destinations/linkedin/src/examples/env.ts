import type { Env, Lintrk } from '../types';

/**
 * Example environment configurations for LinkedIn Insight Tag destination.
 *
 * Tests clone `push` and replace `window.lintrk` with a jest.fn() to collect
 * calls. Production leaves `env` undefined — the destination mutates the real
 * `window` object and injects the LinkedIn CDN script via `addScript()`.
 */

const noop = () => {};

/**
 * Pre-init environment — no LinkedIn state present. The destination's init
 * will populate _linkedin_partner_id and install the lintrk queue.
 */
export const init: Env | undefined = {
  window: {
    _linkedin_partner_id: undefined,
    _linkedin_data_partner_ids: undefined,
    lintrk: undefined,
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
    querySelector: () => null,
  },
};

/**
 * Post-init environment — lintrk is a spy-able no-op function carrying the
 * queue shape the real script installs. Tests clone this and replace
 * `window.lintrk` with a jest.fn() before pushing events, so every call is
 * captured.
 */
export const push: Env = {
  window: {
    _linkedin_partner_id: '123456',
    _linkedin_data_partner_ids: ['123456'],
    lintrk: Object.assign(noop, { q: [] as unknown[] }) as unknown as Lintrk,
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
    querySelector: () => null,
  },
};

/**
 * Simulation tracking paths — used by CLI `--simulate` to record which
 * function calls happened during an event push.
 */
export const simulation = ['call:window.lintrk'];
