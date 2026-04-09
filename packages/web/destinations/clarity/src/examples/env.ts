import type { Env } from '../types';

/**
 * Example environment configurations for Microsoft Clarity destination.
 *
 * The @microsoft/clarity package is imported as a module, so we model
 * the SDK surface at the top level of Env rather than via a window global.
 * Tests clone `push` and replace individual methods with jest spies.
 */

const noop = () => {};

/**
 * Pre-init environment — Clarity SDK methods are no-ops until init wires them.
 * Used by the init code path.
 */
export const init: Env | undefined = {
  clarity: {
    init: noop,
    identify: noop,
    setTag: noop,
    event: noop,
    consent: noop,
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
    consent: noop,
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
  'call:clarity.consent',
  'call:clarity.upgrade',
];
