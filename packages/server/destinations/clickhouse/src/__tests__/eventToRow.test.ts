import type { WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import { eventToRow } from '../eventToRow';

const timestamp = 1700000000123;

/** Every payload carries content, so each JSON column has something to encode. */
const event = getEvent('page view', { timestamp });

/** The same event with every payload emptied, the `''` collapse case. */
const emptyEvent = getEvent('page view', {
  timestamp,
  data: {},
  context: {},
  globals: {},
  custom: {},
  user: {},
  nested: [],
  consent: {},
});

const columns = [
  'name',
  'data',
  'context',
  'globals',
  'custom',
  'user',
  'nested',
  'consent',
  'id',
  'trigger',
  'entity',
  'action',
  'timestamp',
  'timing',
  'source',
];

const events: ReadonlyArray<[string, WalkerOS.Event]> = [
  ['a populated event', event],
  ['an event with empty payloads', emptyEvent],
];

describe('eventToRow', () => {
  it('emits the canonical walkerOS Event v4 columns in order', () => {
    expect(Object.keys(eventToRow(event))).toEqual(columns);
  });

  it.each(['name', 'id', 'trigger', 'entity', 'action', 'timing'] as const)(
    'copies %s from the event unchanged',
    (column) => {
      expect(eventToRow(event)[column]).toBe(event[column]);
    },
  );

  it.each([
    [1700000000123, '2023-11-14 22:13:20.123'],
    [1700000000007, '2023-11-14 22:13:20.007'],
    [1041379445000, '2003-01-01 00:04:05.000'],
    [1735689599999, '2024-12-31 23:59:59.999'],
    [0, '1970-01-01 00:00:00.000'],
  ])('formats epoch %i as the UTC datetime %s', (epoch, expected) => {
    expect(
      eventToRow(getEvent('page view', { timestamp: epoch })).timestamp,
    ).toBe(expected);
  });

  it('keeps the timestamp a string without the ISO 8601 T and Z markers', () => {
    const row = eventToRow(event);

    expect(typeof row.timestamp).toBe('string');
    expect(row.timestamp).not.toMatch(/[TZ]/);
  });

  it.each([
    'data',
    'context',
    'globals',
    'custom',
    'user',
    'nested',
    'consent',
    'source',
  ] as const)('JSON encodes %s', (column) => {
    expect(eventToRow(event)[column]).toBe(JSON.stringify(event[column]));
  });

  it.each(['data', 'context', 'globals', 'custom', 'user', 'consent'] as const)(
    'collapses an empty %s object to an empty string',
    (column) => {
      expect(eventToRow(emptyEvent)[column]).toBe('');
    },
  );

  it('collapses an empty nested array to an empty string', () => {
    expect(eventToRow(emptyEvent).nested).toBe('');
  });

  it.each(events)(
    'emits no null and no undefined column for %s',
    (_, source) => {
      const row: Record<string, unknown> = eventToRow(source);

      expect(Object.keys(row)).toHaveLength(columns.length);

      for (const value of Object.values(row)) {
        expect(value).not.toBeNull();
        expect(value).not.toBeUndefined();
      }
    },
  );
});
