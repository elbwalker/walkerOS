import type { Env } from '../types';

/**
 * Example environment configurations for Microsoft Clarity destination.
 *
 * Tests clone `push` and replace individual methods with jest spies.
 * Production leaves `env.clarity` undefined — the destination falls back
 * to the real `@microsoft/clarity` default export.
 */

const noop = () => {};

/**
 * Pre-init environment — Clarity SDK methods are no-ops until init wires them.
 */
export const init: Env | undefined = {
  clarity: {
    init: noop,
    identify: noop,
    setTag: noop,
    event: noop,
    consentV2: noop,
    upgrade: noop,
  },
};

/**
 * Post-init environment — Clarity SDK methods are spy-able no-ops.
 * Tests clone this and replace individual methods with jest.fn() for assertions.
 */
export const push: Env = {
  clarity: {
    init: noop,
    identify: noop,
    setTag: noop,
    event: noop,
    consentV2: noop,
    upgrade: noop,
  },
};

/**
 * Simulation tracking paths for CLI --simulate
 */
export const simulation = [
  'call:clarity.init',
  'call:clarity.identify',
  'call:clarity.setTag',
  'call:clarity.event',
  'call:clarity.consentV2',
  'call:clarity.upgrade',
];
