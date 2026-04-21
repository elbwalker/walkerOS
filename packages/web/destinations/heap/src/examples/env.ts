import type { Env, HeapSDK } from '../types';

/**
 * Example environment configurations for the Heap destination.
 *
 * Tests clone `push` and replace individual methods with jest spies.
 * Production leaves env undefined — the destination uses the real
 * window.heap command queue it creates during init.
 */

// Narrow helper type aliases so the noop casts don't use `as any`.
type HeapLoad = HeapSDK['load'];
type HeapTrack = HeapSDK['track'];
type HeapIdentify = HeapSDK['identify'];
type HeapAddUserProperties = HeapSDK['addUserProperties'];
type HeapAddEventProperties = HeapSDK['addEventProperties'];

const noop = (() => {}) as (...args: unknown[]) => void;

function createMockHeap(): HeapSDK {
  return {
    load: noop as HeapLoad,
    track: noop as HeapTrack,
    identify: noop as HeapIdentify,
    resetIdentity: noop,
    addUserProperties: noop as HeapAddUserProperties,
    addEventProperties: noop as HeapAddEventProperties,
    clearEventProperties: noop,
    startTracking: noop,
    stopTracking: noop,
  };
}

/**
 * Pre-init env — window.heap is a no-op queue until init wires it.
 */
export const init: Env | undefined = {
  window: {
    heap: createMockHeap(),
  },
};

/**
 * Post-init env — window.heap methods are spy-able no-ops.
 * Tests clone this and replace individual methods with jest.fn() for assertions.
 */
export const push: Env = {
  window: {
    heap: createMockHeap(),
  },
};

/** Simulation tracking paths for CLI --simulate. */
export const simulation = [
  'call:window.heap.track',
  'call:window.heap.identify',
  'call:window.heap.resetIdentity',
  'call:window.heap.addUserProperties',
  'call:window.heap.addEventProperties',
  'call:window.heap.clearEventProperties',
  'call:window.heap.startTracking',
  'call:window.heap.stopTracking',
];
