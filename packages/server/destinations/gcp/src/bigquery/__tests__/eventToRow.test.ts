import { createEvent } from '@walkeros/core';
import { eventToRow } from '../eventToRow';

describe('eventToRow', () => {
  test('produces 15 columns in v4 canonical order', () => {
    const event = createEvent();
    const row = eventToRow(event);
    expect(Object.keys(row)).toEqual([
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
    ]);
  });

  test('JSON-stringifies nested fields', () => {
    const event = createEvent();
    const row = eventToRow(event);
    expect(typeof row.data).toBe('string');
    expect(typeof row.context).toBe('string');
    expect(typeof row.globals).toBe('string');
    expect(typeof row.custom).toBe('string');
    expect(typeof row.user).toBe('string');
    expect(typeof row.nested).toBe('string');
    expect(typeof row.consent).toBe('string');
    expect(typeof row.source).toBe('string');
  });

  test('keeps scalars as scalars', () => {
    const event = createEvent();
    const row = eventToRow(event);
    expect(typeof row.name).toBe('string');
    expect(typeof row.id).toBe('string');
    expect(typeof row.entity).toBe('string');
    expect(typeof row.action).toBe('string');
    expect(typeof row.trigger).toBe('string');
    expect(typeof row.timing).toBe('number');
  });

  test('emits timestamp as INT64 microseconds since epoch', () => {
    // BQ Storage Write API encodes TIMESTAMP as INT64 microseconds. The SDK
    // calls Long.fromString on the value; ISO strings would fail with
    // "interior hyphen" because the date hyphens are non-numeric.
    const event = createEvent();
    event.timestamp = 1700000000000; // ms
    const row = eventToRow(event);
    expect(typeof row.timestamp).toBe('number');
    expect(row.timestamp).toBe(1700000000000 * 1000);
  });

  test('emits null for empty objects in JSON columns', () => {
    const event = createEvent();
    event.data = {};
    event.context = {};
    const row = eventToRow(event);
    expect(row.data).toBeNull();
    expect(row.context).toBeNull();
  });

  test('does not include createdAt', () => {
    const event = createEvent();
    const row = eventToRow(event);
    expect('createdAt' in row).toBe(false);
  });
});
