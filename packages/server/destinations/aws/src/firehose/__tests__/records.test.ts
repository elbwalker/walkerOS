import { createEvent } from '@walkeros/core';
import {
  MAX_BYTES_PER_CALL,
  MAX_RECORD_BYTES,
  planChunks,
  toPayload,
  toRecordData,
} from '../lib/records';

describe('toPayload', () => {
  const event = createEvent();

  test('a mapped object is the payload', () => {
    expect(toPayload(event, { id: 'x' })).toEqual({ id: 'x' });
  });

  test.each([
    ['a string', 'text'],
    ['a number', 42],
    ['empty', ''],
    ['undefined', undefined],
  ])('%s falls back to the event', (_case, data) => {
    expect(toPayload(event, data)).toBe(event);
  });
});

describe('toRecordData', () => {
  test('appends a newline by default', () => {
    expect(toRecordData({ a: 1 }).toString()).toBe('{"a":1}\n');
  });

  test('newline false sends the bare object', () => {
    expect(toRecordData({ a: 1 }, false).toString()).toBe('{"a":1}');
  });
});

/** A payload whose record is exactly `bytes` long, newline included. */
function sized(bytes: number): { p: string } {
  return { p: 'x'.repeat(bytes - '{"p":""}\n'.length) };
}

describe('planChunks', () => {
  test('1,200 small records give chunks of 500, 500 and 200, in order', () => {
    const payloads = Array.from({ length: 1200 }, (_, i) => ({ i }));
    const { chunks, refused } = planChunks(payloads, true);

    expect(chunks.map((chunk) => chunk.length)).toEqual([500, 500, 200]);
    expect(chunks.flat().map(({ index }) => index)).toEqual(
      payloads.map((_, i) => i),
    );
    expect(refused).toEqual([]);
  });

  test('the byte cap splits before 2,900,000 bytes', () => {
    const payloads = Array.from({ length: 4 }, () => sized(900_000));
    const { chunks } = planChunks(payloads, true);

    expect(chunks.map((chunk) => chunk.length)).toEqual([3, 1]);
    for (const chunk of chunks) {
      const bytes = chunk.reduce((sum, r) => sum + r.data.byteLength, 0);
      expect(bytes).toBeLessThanOrEqual(MAX_BYTES_PER_CALL);
    }
  });

  test('1,000,000 bytes is kept, one byte more is RecordTooLarge', () => {
    const { chunks, refused } = planChunks(
      [sized(MAX_RECORD_BYTES), sized(MAX_RECORD_BYTES + 1)],
      true,
    );

    expect(chunks).toHaveLength(1);
    expect(chunks[0][0].data.byteLength).toBe(MAX_RECORD_BYTES);
    expect(refused).toEqual([
      expect.objectContaining({ index: 1, code: 'RecordTooLarge' }),
    ]);
  });

  test('a cyclic payload is InvalidRecord and its neighbours still go', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const { chunks, refused } = planChunks([{ a: 1 }, cyclic, { b: 2 }], true);

    expect(chunks.flat().map(({ index }) => index)).toEqual([0, 2]);
    expect(refused).toEqual([
      expect.objectContaining({ index: 1, code: 'InvalidRecord' }),
    ]);
  });

  test('empty input gives no chunks', () => {
    expect(planChunks([], true)).toEqual({ chunks: [], refused: [] });
  });
});
