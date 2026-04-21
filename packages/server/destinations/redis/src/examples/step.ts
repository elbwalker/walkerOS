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
  title: 'Default stream',
  description:
    'An event is appended to the configured Redis stream via XADD with the full event JSON as a single field.',
  in: getEvent('page view', {
    timestamp: 1700000100,
  }),
  out: [['client.xadd', ['walkeros:events', '*', 'event', 'json:event']]],
};

/**
 * Order event -- verifies different event types pass through correctly.
 */
export const orderComplete: RedisStepExample = {
  title: 'Order event',
  description:
    'An order complete event is appended to the Redis stream alongside other event types for downstream consumers.',
  in: getEvent('order complete', {
    timestamp: 1700000101,
    data: { id: 'ORD-400', total: 99.99, currency: 'EUR' },
  }),
  out: [['client.xadd', ['walkeros:events', '*', 'event', 'json:event']]],
};

/**
 * With MAXLEN approximate trimming -- trimming args inserted before '*'.
 */
export const withMaxLen: RedisStepExample = {
  title: 'MAXLEN trim',
  description:
    'XADD uses approximate MAXLEN trimming to cap the Redis stream length, discarding older entries efficiently.',
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
    [
      'client.xadd',
      ['walkeros:events', 'MAXLEN', '~', 50000, '*', 'event', 'json:event'],
    ],
  ],
};

/**
 * Exact MAXLEN trimming -- no '~' between MAXLEN and the count.
 */
export const withExactTrim: RedisStepExample = {
  title: 'Exact trim',
  description:
    'XADD uses exact MAXLEN trimming to enforce a precise Redis stream length at the cost of extra work.',
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
    [
      'client.xadd',
      ['walkeros:events', 'MAXLEN', 5000, '*', 'event', 'json:event'],
    ],
  ],
};

/**
 * Stream key override per rule -- routes this event to a dedicated stream.
 */
export const streamKeyOverride: RedisStepExample = {
  title: 'Stream key override',
  description:
    'A mapping rule routes the event to a dedicated Redis stream instead of the destination default.',
  in: getEvent('order complete', {
    timestamp: 1700000104,
    data: { id: 'ORD-500', total: 42 },
  }),
  mapping: {
    settings: {
      streamKey: 'walkeros:orders',
    },
  },
  out: [['client.xadd', ['walkeros:orders', '*', 'event', 'json:event']]],
};

/**
 * Ignored event -- mapping.ignore: true produces no xadd call.
 */
export const ignoredEvent: RedisStepExample = {
  public: false,
  in: getEvent('debug noise', {
    timestamp: 1700000105,
  }),
  mapping: { ignore: true },
  out: [],
};
