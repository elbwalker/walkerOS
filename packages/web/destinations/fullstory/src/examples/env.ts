import type { Env } from '../types';

/**
 * Example environment configurations for FullStory destination.
 *
 * Tests clone `push` and replace individual methods with jest spies.
 * Production leaves `env.fullstory` undefined -- the destination falls back
 * to the real `@fullstory/browser` SDK.
 */

const noop = () => {};

// Narrow helper types for the shared `noop` -> specific SDK signatures without
// loose casts.
type FSInit = NonNullable<Env['fullstory']>['init'];
type FSTrackEvent = NonNullable<Env['fullstory']>['trackEvent'];
type FSSetIdentity = NonNullable<Env['fullstory']>['setIdentity'];
type FSSetProperties = NonNullable<Env['fullstory']>['setProperties'];

/**
 * Pre-init environment -- FullStory SDK methods are no-ops until init wires them.
 */
export const init: Env | undefined = {
  fullstory: {
    init: noop as FSInit,
    trackEvent: noop as FSTrackEvent,
    setIdentity: noop as FSSetIdentity,
    setProperties: noop as FSSetProperties,
    shutdown: noop,
    start: noop,
  },
};

/**
 * Post-init environment -- FullStory SDK methods are spy-able no-ops.
 * Tests clone this and replace individual methods with jest.fn() for assertions.
 */
export const push: Env = {
  fullstory: {
    init: noop as FSInit,
    trackEvent: noop as FSTrackEvent,
    setIdentity: noop as FSSetIdentity,
    setProperties: noop as FSSetProperties,
    shutdown: noop,
    start: noop,
  },
};

/**
 * Simulation tracking paths for CLI --simulate
 */
export const simulation = [
  'call:fullstory.init',
  'call:fullstory.trackEvent',
  'call:fullstory.setIdentity',
  'call:fullstory.setProperties',
  'call:fullstory.shutdown',
  'call:fullstory.start',
];
