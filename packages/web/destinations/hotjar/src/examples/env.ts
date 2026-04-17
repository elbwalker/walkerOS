import type { Env } from '../types';

/**
 * Example environment configurations for Hotjar destination.
 *
 * Tests clone `push` and replace individual methods with jest spies.
 * Production leaves `env.hotjar` undefined -- the destination falls back
 * to the real `@hotjar/browser` default export.
 */

const noop = (() => true) as (...args: unknown[]) => boolean;

/**
 * Pre-init environment -- Hotjar SDK methods are no-ops until init wires them.
 */
export const init: Env | undefined = {
  hotjar: {
    init: noop as HotjarInit,
    event: noop,
    identify: noop as HotjarIdentify,
    stateChange: noop,
    isReady: () => false,
  },
};

/**
 * Post-init environment -- Hotjar SDK methods are spy-able no-ops.
 * Tests clone this and replace individual methods with jest.fn() for assertions.
 */
export const push: Env = {
  hotjar: {
    init: noop as HotjarInit,
    event: noop,
    identify: noop as HotjarIdentify,
    stateChange: noop,
    isReady: () => true,
  },
};

/**
 * Simulation tracking paths for CLI --simulate
 */
export const simulation = [
  'call:hotjar.init',
  'call:hotjar.event',
  'call:hotjar.identify',
  'call:hotjar.stateChange',
];

// Local helper types to narrow the generic `noop` to the specific SDK
// signatures without loose casts.
type HotjarInit = NonNullable<Env['hotjar']>['init'];
type HotjarIdentify = NonNullable<Env['hotjar']>['identify'];
