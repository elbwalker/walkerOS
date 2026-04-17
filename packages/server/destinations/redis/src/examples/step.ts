import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Extended step example that may carry destination-level settings overrides.
 */
export type RedisStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
};

/**
 * Default JSON serialization -- single 'event' field with full event JSON.
 */
export const jsonDefault: RedisStepExample = {
  in: getEvent('page view', {
    timestamp: 1700000100,
  }),
  out: ['client.xadd', ['walkeros:events', '*', 'event', 'json:event']],
};

/**
 * Order event -- verifies different event types pass through correctly.
 */
export const orderComplete: RedisStepExample = {
  in: getEvent('order complete', {
    timestamp: 1700000101,
    data: { id: 'ORD-400', total: 99.99, currency: 'EUR' },
  }),
  out: ['client.xadd', ['walkeros:events', '*', 'event', 'json:event']],
};

/**
 * With MAXLEN approximate trimming -- trimming args inserted before '*'.
 */
export const withMaxLen: RedisStepExample = {
  in: getEvent('product view', {
    timestamp: 1700000102,
    data: { id: 'SKU-123', name: 'Widget' },
  }),
  settings: {
    redis: {
      streamKey: 'walkeros:events',
      maxLen: 50000,
    },
  },
  out: [
    'client.xadd',
    ['walkeros:events', 'MAXLEN', '~', 50000, '*', 'event', 'json:event'],
  ],
};

/**
 * Exact MAXLEN trimming -- no '~' between MAXLEN and the count.
 */
export const withExactTrim: RedisStepExample = {
  in: getEvent('page view', {
    timestamp: 1700000103,
  }),
  settings: {
    redis: {
      streamKey: 'walkeros:events',
      maxLen: 5000,
      exactTrimming: true,
    },
  },
  out: [
    'client.xadd',
    ['walkeros:events', 'MAXLEN', 5000, '*', 'event', 'json:event'],
  ],
};

/**
 * Stream key override per rule -- routes this event to a dedicated stream.
 */
export const streamKeyOverride: RedisStepExample = {
  in: getEvent('order complete', {
    timestamp: 1700000104,
    data: { id: 'ORD-500', total: 42 },
  }),
  mapping: {
    settings: {
      streamKey: 'walkeros:orders',
    },
  },
  out: ['client.xadd', ['walkeros:orders', '*', 'event', 'json:event']],
};

/**
 * Ignored event -- mapping.ignore: true produces no xadd call.
 */
export const ignoredEvent: RedisStepExample = {
  in: getEvent('debug noise', {
    timestamp: 1700000105,
  }),
  mapping: { ignore: true },
  out: [],
};
