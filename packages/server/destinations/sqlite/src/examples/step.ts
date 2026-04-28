import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Extended step example that may carry destination-level settings overrides.
 */
export type SqliteStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
};

/**
 * Canonical insert into the default `events` table. `out` records the
 * column args the prepared INSERT is bound with.
 */
export const defaultInsert: SqliteStepExample = {
  title: 'Default insert',
  description:
    'A walker event is inserted into the default events table with canonical columns and JSON-encoded sections.',
  in: getEvent('page view', {
    timestamp: 1700000100,
    id: 'evt-1',
    user: { session: 'sess-1', id: 'user-42' },
    data: { title: 'Home' },
    source: {
      type: 'browser',
      platform: 'web',
      url: 'https://example.com/',
      referrer: 'https://example.com/prev',
    },
    globals: { env: 'prod' },
    consent: { analytics: true },
  }),
  out: [
    [
      'client.runInsert',
      [
        1700000100,
        'evt-1',
        'page view',
        'page',
        'view',
        'sess-1',
        'user-42',
        'https://example.com/',
        'Home',
        'https://example.com/prev',
        JSON.stringify({ title: 'Home' }),
        JSON.stringify({ env: 'prod' }),
        JSON.stringify({ analytics: true }),
      ],
    ],
  ],
};

/**
 * Custom table name. Verifies table overrides while using the canonical column set.
 */
export const customTable: SqliteStepExample = {
  title: 'Custom table',
  description:
    'A destination-level table setting inserts events into a custom SQLite table with the same column layout.',
  in: getEvent('form submit', {
    timestamp: 1700000101,
    id: 'evt-2',
    user: { session: 'sess-99', id: '' },
    data: { type: 'contact' },
    source: {
      type: 'browser',
      platform: 'web',
      url: 'https://example.com/contact',
    },
    globals: {},
    consent: {},
  }),
  settings: {
    sqlite: {
      url: ':memory:',
      table: 'siteEvents',
    },
  },
  out: [
    [
      'client.runInsert',
      [
        1700000101,
        'evt-2',
        'form submit',
        'form',
        'submit',
        'sess-99',
        '',
        'https://example.com/contact',
        '',
        '',
        JSON.stringify({ type: 'contact' }),
        JSON.stringify({}),
        JSON.stringify({}),
      ],
    ],
  ],
};

/**
 * Order event with numeric data. Confirms JSON serialization of nested values.
 */
export const orderComplete: SqliteStepExample = {
  title: 'Order insert',
  description:
    'An order complete is inserted with numeric data serialized as JSON in the data column.',
  in: getEvent('order complete', {
    timestamp: 1700000102,
    id: 'evt-3',
    user: { session: '', id: '' },
    data: { id: 'ORD-1', total: 99 },
    source: { type: 'collector', schema: '4' },
    globals: {},
    consent: {},
  }),
  out: [
    [
      'client.runInsert',
      [
        1700000102,
        'evt-3',
        'order complete',
        'order',
        'complete',
        '',
        '',
        '',
        '',
        '',
        JSON.stringify({ id: 'ORD-1', total: 99 }),
        JSON.stringify({}),
        JSON.stringify({}),
      ],
    ],
  ],
};

/**
 * Table override per rule -- routes this event to a dedicated table.
 */
export const tableOverride: SqliteStepExample = {
  title: 'Table override',
  description:
    'A mapping rule overrides the target table so specific events are inserted into a dedicated SQLite table.',
  in: getEvent('order complete', {
    timestamp: 1700000103,
    id: 'evt-4',
    user: { session: '', id: '' },
    data: { id: 'ORD-2', total: 42 },
    source: { type: 'collector', schema: '4' },
    globals: {},
    consent: {},
  }),
  mapping: {
    settings: {
      table: 'orders',
    },
  },
  out: [
    [
      'client.runInsert',
      [
        1700000103,
        'evt-4',
        'order complete',
        'order',
        'complete',
        '',
        '',
        '',
        '',
        '',
        JSON.stringify({ id: 'ORD-2', total: 42 }),
        JSON.stringify({}),
        JSON.stringify({}),
      ],
    ],
  ],
};

/**
 * Ignored event -- mapping.ignore: true produces no insert call.
 */
export const ignoredEvent: SqliteStepExample = {
  public: false,
  in: getEvent('debug noise', {
    timestamp: 1700000104,
    id: 'evt-5',
    source: { type: 'collector', schema: '4' },
  }),
  mapping: { ignore: true },
  out: [],
};
