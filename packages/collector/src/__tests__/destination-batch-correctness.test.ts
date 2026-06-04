/**
 * Batch correctness tests (PROD-004).
 *
 * Three coupled defects exercised here:
 *   1. Per-event context (ingest / respond / logger) leaks across batched
 *      events: the original code captured the FIRST event's ingest in a
 *      closure and reused it for every subsequent batched event.
 *   2. Batch failures disappear: `useHooks(pushBatch, ...)` was fire-and-
 *      forget; rejections did not reach DLQ, did not increment `failed`,
 *      and did not log.
 *   3. Debounce never fires under sustained load: every push reset the
 *      timer. With size/age caps now landed on `debounce`, the batch
 *      flushes deterministically.
 */
import type { Destination, WalkerOS } from '@walkeros/core';
import { createEvent, createIngest } from '@walkeros/core';
import { pushToDestinations, startFlow } from '..';

describe('Destination batch correctness (PROD-004)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Helper to build a test event with a stable name/id so we can match
  // entries through the pipeline.
  function makeEvent(i: number): WalkerOS.Event {
    const e = createEvent();
    e.name = 'page view';
    e.id = `e-${i}`;
    return e;
  }

  it('preserves per-event ingest across batched entries, routes failures to DLQ, and caps batch size', async () => {
    type Recorded = {
      requestIds: string[];
      eventIds: string[];
      entryCount: number;
    };
    const recordedBatches: Recorded[] = [];

    // pushBatch throws on the second invocation; first succeeds.
    let callIndex = 0;
    const mockPushBatch = jest.fn((batch: Destination.Batch<unknown>) => {
      const requestIds = batch.entries.map((entry) => {
        const meta = entry.ingest?._meta as { path?: string[] } | undefined;
        return meta?.path?.[0] ?? 'missing';
      });
      const eventIds = batch.entries.map((entry) => entry.event.id);
      recordedBatches.push({
        requestIds,
        eventIds,
        entryCount: batch.entries.length,
      });
      const i = callIndex++;
      if (i === 1) {
        throw new Error('batch boom');
      }
    });

    const mockPush = jest.fn();
    const dest: Destination.Instance = {
      type: 'batched',
      push: mockPush,
      pushBatch: mockPushBatch,
      config: {
        init: true,
        // size cap of 50 forces flush at exactly 50 entries.
        // Per Q3: canonical shape is { wait, size, age }.
        // We use a high `wait` so debounce never fires on its own.
        batch: { wait: 60_000, size: 50 },
        mapping: {
          '*': { '*': { batch: 1 } }, // mapping-level enables batching
        },
      },
    };

    const { collector } = await startFlow({
      destinations: { batchDest: { code: dest } },
    });

    // First wave: 50 events, each with a distinct ingest. The size cap
    // should fire flush at the 50th entry without any timer advance.
    for (let i = 0; i < 50; i++) {
      await pushToDestinations(
        collector,
        makeEvent(i),
        { ingest: createIngest(`req-${i}`) },
        collector.destinations,
      );
    }

    // size=50 should have triggered a synchronous flush.
    expect(mockPushBatch).toHaveBeenCalledTimes(1);
    expect(recordedBatches[0].entryCount).toBe(50);

    // Defect 1: every entry should carry its own ingest, not the first event's.
    expect(recordedBatches[0].requestIds).toEqual(
      Array.from({ length: 50 }, (_, i) => `req-${i}`),
    );
    expect(recordedBatches[0].eventIds).toEqual(
      Array.from({ length: 50 }, (_, i) => `e-${i}`),
    );

    // Success-path counters: 50 events delivered, none failed.
    const destStatus = collector.status.destinations['batchDest'];
    expect(destStatus.count).toBe(50);
    expect(destStatus.failed).toBe(0);

    // Second wave: 50 more events. Same destination, fresh window. The
    // throwing pushBatch must route the whole batch to DLQ (defect 2).
    for (let i = 50; i < 100; i++) {
      await pushToDestinations(
        collector,
        makeEvent(i),
        { ingest: createIngest(`req-${i}`) },
        collector.destinations,
      );
    }

    // Let any pending microtasks (the awaited pushBatch + tryCatchAsync) settle.
    await jest.advanceTimersByTimeAsync(0);

    expect(mockPushBatch).toHaveBeenCalledTimes(2);
    expect(recordedBatches[1].entryCount).toBe(50);
    // Per-event ingest preserved in the failed batch too.
    expect(recordedBatches[1].requestIds).toEqual(
      Array.from({ length: 50 }, (_, i) => `req-${50 + i}`),
    );

    // Defect 2: every failed entry should be in DLQ as [event, error].
    const updatedDest = collector.destinations['batchDest'];
    expect(updatedDest.dlq).toBeDefined();
    expect(updatedDest.dlq!.length).toBe(50);
    expect(updatedDest.dlq![0][0].id).toBe('e-50');
    expect(updatedDest.dlq![0][1]).toBeInstanceOf(Error);
    expect((updatedDest.dlq![0][1] as Error).message).toBe('batch boom');

    // Failed counter incremented by the full batch size.
    expect(collector.status.destinations['batchDest'].failed).toBe(50);
  });

  it('splits 1500 events into two batches of size 1000 and 500 in arrival order', async () => {
    const batches: number[] = [];
    const seenIds: string[][] = [];
    const mockPushBatch = jest.fn((batch: Destination.Batch<unknown>) => {
      batches.push(batch.entries.length);
      seenIds.push(batch.entries.map((e) => e.event.id));
    });

    const dest: Destination.Instance = {
      type: 'sized',
      push: jest.fn(),
      pushBatch: mockPushBatch,
      config: {
        init: true,
        batch: { wait: 60_000, size: 1000 },
        mapping: { '*': { '*': { batch: 1 } } },
      },
    };

    const { collector } = await startFlow({
      destinations: { sizedDest: { code: dest } },
    });

    for (let i = 0; i < 1500; i++) {
      await pushToDestinations(
        collector,
        makeEvent(i),
        { ingest: createIngest(`req-${i}`) },
        collector.destinations,
      );
    }

    // Drain the pending window with a flush (no timer advance to reach age).
    await collector.destinations['sizedDest'].batches!['* *'].flush();

    expect(mockPushBatch).toHaveBeenCalledTimes(2);
    expect(batches).toEqual([1000, 500]);
    // Arrival order preserved across the two batches.
    expect(seenIds[0][0]).toBe('e-0');
    expect(seenIds[0][999]).toBe('e-999');
    expect(seenIds[1][0]).toBe('e-1000');
    expect(seenIds[1][499]).toBe('e-1499');
  });

  it('flush() drains a pending batch without timer advance (shutdown seam)', async () => {
    const recorded: number[] = [];
    const mockPushBatch = jest.fn((batch: Destination.Batch<unknown>) => {
      recorded.push(batch.entries.length);
    });

    const dest: Destination.Instance = {
      type: 'long-wait',
      push: jest.fn(),
      pushBatch: mockPushBatch,
      config: {
        init: true,
        mapping: { '*': { '*': { batch: 60_000 } } }, // 1 minute debounce
      },
    };

    const { collector } = await startFlow({
      destinations: { d: { code: dest } },
    });

    for (let i = 0; i < 5; i++) {
      await pushToDestinations(
        collector,
        makeEvent(i),
        { ingest: createIngest(`req-${i}`) },
        collector.destinations,
      );
    }

    // No timer advance. Forced flush from outside.
    expect(mockPushBatch).not.toHaveBeenCalled();
    await collector.destinations['d'].batches!['* *'].flush();
    expect(mockPushBatch).toHaveBeenCalledTimes(1);
    expect(recorded[0]).toBe(5);
  });

  it('shutdown waits for an in-flight async batch append', async () => {
    let resolveAppend: (() => void) | undefined;
    let settled = false;
    const mockPushBatch = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAppend = () => {
            settled = true;
            resolve();
          };
        }),
    );

    const dest: Destination.Instance = {
      type: 'async-batch',
      push: jest.fn(),
      pushBatch: mockPushBatch,
      config: {
        init: true,
        mapping: { '*': { '*': { batch: 60_000 } } },
      },
    };

    const { collector } = await startFlow({
      destinations: { d: { code: dest } },
    });

    for (let i = 0; i < 3; i++) {
      await pushToDestinations(
        collector,
        makeEvent(i),
        { ingest: createIngest(`req-${i}`) },
        collector.destinations,
      );
    }

    // Start the flush but do not await it yet: the async pushBatch is in-flight.
    let flushResolved = false;
    const flushPromise = collector.destinations['d']
      .batches!['* *'].flush()
      .then(() => {
        flushResolved = true;
      });

    // Let the pushBatch call begin and the await chain reach the pending promise.
    await jest.advanceTimersByTimeAsync(0);

    expect(mockPushBatch).toHaveBeenCalledTimes(1);
    // flush() must not resolve while the append promise is still pending.
    expect(settled).toBe(false);
    expect(flushResolved).toBe(false);

    // Resolve the in-flight append; now flush() should settle.
    resolveAppend!();
    await flushPromise;

    expect(settled).toBe(true);
    expect(flushResolved).toBe(true);
  });

  it('a rejected async pushBatch routes the batch to the DLQ and increments failed, not out', async () => {
    const mockPushBatch = jest.fn(() =>
      Promise.reject(new Error('async batch boom')),
    );

    const dest: Destination.Instance = {
      type: 'async-rejecting',
      push: jest.fn(),
      pushBatch: mockPushBatch,
      config: {
        init: true,
        mapping: { '*': { '*': { batch: 1 } } },
      },
    };

    const { collector } = await startFlow({
      destinations: { d: { code: dest } },
    });

    for (let i = 0; i < 5; i++) {
      await pushToDestinations(
        collector,
        makeEvent(i),
        { ingest: createIngest(`req-${i}`) },
        collector.destinations,
      );
    }

    await collector.destinations['d'].batches!['* *'].flush();

    // Whole batch routed to DLQ as [event, error].
    const dlq = collector.destinations['d'].dlq;
    expect(dlq).toBeDefined();
    expect(dlq!.length).toBe(5);
    expect(dlq![0][0].id).toBe('e-0');
    const firstError = dlq![0][1];
    expect(firstError).toBeInstanceOf(Error);
    if (!(firstError instanceof Error)) throw new Error('expected Error');
    expect(firstError.message).toBe('async batch boom');

    const destStatus = collector.status.destinations['d'];
    // failed incremented by full batch size; success counters untouched.
    expect(destStatus.failed).toBe(5);
    expect(destStatus.count).toBe(0);
  });

  it('routes batch failure to DLQ without leaking unhandled rejections', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (err: unknown): void => {
      unhandled.push(err);
    };
    process.once('unhandledRejection', onUnhandled);

    const mockPushBatch = jest.fn(() => {
      throw new Error('sync throw');
    });

    const dest: Destination.Instance = {
      type: 'throwing',
      push: jest.fn(),
      pushBatch: mockPushBatch,
      config: {
        init: true,
        mapping: { '*': { '*': { batch: 1 } } },
      },
    };

    const { collector } = await startFlow({
      destinations: { d: { code: dest } },
    });

    await pushToDestinations(
      collector,
      makeEvent(0),
      { ingest: createIngest('req-0') },
      collector.destinations,
    );

    await collector.destinations['d'].batches!['* *'].flush();

    expect(collector.destinations['d'].dlq?.length).toBe(1);
    expect(collector.destinations['d'].dlq?.[0][0].id).toBe('e-0');

    // Settle microtasks for any pending rejection.
    await Promise.resolve();
    expect(unhandled).toEqual([]);

    process.removeListener('unhandledRejection', onUnhandled);
  });
});
