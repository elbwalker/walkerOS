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
import type { Destination, Logger, WalkerOS } from '@walkeros/core';
import { createEvent, createIngest, Level } from '@walkeros/core';
import { pushToDestinations, startFlow } from '..';

// Capture WARN-level log messages (+ their context) via a custom handler.
function makeWarnCapture(): {
  warnings: Array<{ message: string; context: Logger.LogContext }>;
  handler: Logger.Handler;
} {
  const warnings: Array<{ message: string; context: Logger.LogContext }> = [];
  const handler: Logger.Handler = (level, message, context) => {
    if (level === Level.WARN) warnings.push({ message, context });
  };
  return { warnings, handler };
}

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

  it('shutdown awaits a batch the size cap auto-fired while pushBatch is still in flight', async () => {
    // Regression: the debounce SIZE cap fires `flushBatch` autonomously, so by
    // the time shutdown calls flush() the buffer is already drained
    // (lastArgs/pending empty). flush() used to early-return undefined and let
    // teardown race the still-in-flight append, dropping the delivery.
    type Deferred = { promise: Promise<void>; resolve: () => void };
    function defer(): Deferred {
      let resolve: () => void = () => {};
      const promise = new Promise<void>((res) => {
        resolve = res;
      });
      return { promise, resolve };
    }

    const appendGate = defer();
    let appendSettled = false;
    const seenSizes: number[] = [];
    const mockPushBatch = jest.fn(async (batch: Destination.Batch<unknown>) => {
      seenSizes.push(batch.entries.length);
      await appendGate.promise;
      appendSettled = true;
    });

    let destroyed = false;
    const dest: Destination.Instance = {
      type: 'async-autofire',
      push: jest.fn(),
      pushBatch: mockPushBatch,
      destroy: () => {
        destroyed = true;
      },
      config: {
        init: true,
        // size cap of 3 + a long wait: the 3rd push fires flushBatch on its own,
        // shutdown never gets to drive the fire itself.
        batch: { wait: 60_000, size: 3 },
        mapping: { '*': { '*': { batch: 1 } } },
      },
    };

    const { collector, elb } = await startFlow({
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

    // Let the autonomous fire begin and the append reach its gate.
    await jest.advanceTimersByTimeAsync(0);
    expect(mockPushBatch).toHaveBeenCalledTimes(1);
    expect(seenSizes[0]).toBe(3);
    expect(appendSettled).toBe(false);

    // Graceful shutdown while the append is still in flight.
    let shutdownDone = false;
    const shutdown = elb('walker shutdown').then(() => {
      shutdownDone = true;
    });

    // Shutdown must NOT complete (and must NOT destroy the destination) while
    // the in-flight append is unresolved.
    await jest.advanceTimersByTimeAsync(0);
    expect(shutdownDone).toBe(false);
    expect(destroyed).toBe(false);
    expect(appendSettled).toBe(false);

    // Resolve the append; shutdown should now settle and only then destroy.
    appendGate.resolve();
    await shutdown;

    expect(appendSettled).toBe(true);
    expect(shutdownDone).toBe(true);
    expect(destroyed).toBe(true);
    // Delivery counted, nothing dropped or failed.
    expect(collector.status.destinations['d'].count).toBe(3);
    expect(collector.status.destinations['d'].failed).toBe(0);
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

  it('caps the DLQ at dlqMax on a whole-batch failure, counts the overflow dropped, and warns once', async () => {
    const { warnings, handler } = makeWarnCapture();
    const mockPushBatch = jest.fn(() => {
      throw new Error('whole batch boom');
    });

    const dest: Destination.Instance = {
      type: 'overflowing',
      push: jest.fn(),
      pushBatch: mockPushBatch,
      config: {
        init: true,
        // dlqMax smaller than the 5-entry batch: 3 entries must be dropped.
        dlqMax: 2,
        mapping: { '*': { '*': { batch: 1 } } },
      },
    };

    const { collector } = await startFlow({
      destinations: { d: { code: dest } },
      // Default log level is ERROR; raise to WARN so the overflow warn surfaces.
      logger: { level: 'WARN', handler },
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

    // Only dlqMax (2) entries retained; dropOldest keeps the newest two.
    const dlq = collector.destinations['d'].dlq;
    expect(dlq).toBeDefined();
    expect(dlq!.length).toBe(2);
    expect(dlq![0][0].id).toBe('e-3');
    expect(dlq![1][0].id).toBe('e-4');

    // Drop counter records the 3 evicted entries under the dlq buffer.
    const destStepId = Object.keys(collector.status.dropped).find((id) =>
      id.includes('destination'),
    );
    expect(destStepId).toBeDefined();
    expect(collector.status.dropped[destStepId!].dlq).toBe(3);

    // Whole batch counted as failed regardless of DLQ eviction.
    expect(collector.status.destinations['d'].failed).toBe(5);
    expect(collector.status.destinations['d'].dlqSize).toBe(2);

    // Overflow warn fired exactly once, with the cap + cumulative drop count.
    const overflowWarns = warnings.filter((w) =>
      /destination\.dlq overflow/.test(w.message),
    );
    expect(overflowWarns.length).toBe(1);
    expect(overflowWarns[0].context.buffer).toBe('dlq');
    expect(overflowWarns[0].context.cap).toBe(2);
    expect(overflowWarns[0].context.droppedCount).toBe(3);
  });

  it('a returned BatchOutcome DLQs only the failed entries and counts the rest delivered', async () => {
    // pushBatch returns a per-row outcome: entry index 1 of 3 failed.
    const mockPushBatch = jest.fn(
      (_batch: Destination.Batch<unknown>): Destination.BatchOutcome => ({
        failed: [{ index: 1, error: new Error('row 1 invalid') }],
      }),
    );

    const dest: Destination.Instance = {
      type: 'partial-outcome',
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

    for (let i = 0; i < 3; i++) {
      await pushToDestinations(
        collector,
        makeEvent(i),
        { ingest: createIngest(`req-${i}`) },
        collector.destinations,
      );
    }

    await collector.destinations['d'].batches!['* *'].flush();

    // Only the single failed entry is on the DLQ, with its own per-row error.
    const dlq = collector.destinations['d'].dlq;
    expect(dlq).toBeDefined();
    expect(dlq!.length).toBe(1);
    expect(dlq![0][0].id).toBe('e-1');
    const rowError = dlq![0][1];
    expect(rowError).toBeInstanceOf(Error);
    if (!(rowError instanceof Error)) throw new Error('expected Error');
    expect(rowError.message).toBe('row 1 invalid');

    const destStatus = collector.status.destinations['d'];
    // 1 failed, 2 delivered.
    expect(destStatus.failed).toBe(1);
    expect(destStatus.count).toBe(2);
  });

  it('a BatchOutcome with empty failed counts the whole batch delivered', async () => {
    const mockPushBatch = jest.fn(
      (_batch: Destination.Batch<unknown>): Destination.BatchOutcome => ({
        failed: [],
      }),
    );

    const dest: Destination.Instance = {
      type: 'empty-outcome',
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

    for (let i = 0; i < 3; i++) {
      await pushToDestinations(
        collector,
        makeEvent(i),
        { ingest: createIngest(`req-${i}`) },
        collector.destinations,
      );
    }

    await collector.destinations['d'].batches!['* *'].flush();

    expect(collector.destinations['d'].dlq?.length ?? 0).toBe(0);
    const destStatus = collector.status.destinations['d'];
    expect(destStatus.failed).toBe(0);
    expect(destStatus.count).toBe(3);
  });

  it('a BatchOutcome failure carries a generic error to the DLQ when no per-row error is given', async () => {
    const mockPushBatch = jest.fn(
      (_batch: Destination.Batch<unknown>): Destination.BatchOutcome => ({
        failed: [{ index: 0 }],
      }),
    );

    const dest: Destination.Instance = {
      type: 'outcome-no-error',
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

    const dlq = collector.destinations['d'].dlq;
    expect(dlq?.length).toBe(1);
    expect(dlq![0][0].id).toBe('e-0');
    // A real error object lands on the DLQ even without a per-row error.
    expect(dlq![0][1]).toBeInstanceOf(Error);

    const destStatus = collector.status.destinations['d'];
    expect(destStatus.failed).toBe(1);
    expect(destStatus.count).toBe(0);
  });

  // --- config.batch enabler routing (BATCH_ALL_KEY) ---------------------
  //
  // These three pin the untested routing branches of the `config.batch`
  // enabler: a destination-wide default buffer keyed by the reserved
  // BATCH_ALL_KEY (' batch-all', leading space). They are characterization
  // tests asserting the CURRENT behavior of destination.ts.

  it('(e) config.batch + a wildcard "* *" rule with batch routes to the "* *" buffer, never " batch-all", and rule bounds win', async () => {
    // Both config.batch (bounds) AND a wildcard rule with its own batch are set.
    // ruleHasBatch is true for every event (the "* *" rule matches all), so
    // mappingKey = processed.mappingKey ("* *"), NOT the reserved BATCH_ALL_KEY.
    // The rule's size (2) overrides config.batch's size (50): the buffer must
    // flush at 2 entries, proving config.batch only supplies bounds fallback.
    const batchSizes: number[] = [];
    const mockPushBatch = jest.fn((batch: Destination.Batch<unknown>) => {
      batchSizes.push(batch.entries.length);
    });

    const dest: Destination.Instance = {
      type: 'wildcard-and-config',
      push: jest.fn(),
      pushBatch: mockPushBatch,
      config: {
        init: true,
        // config.batch bounds: high wait, size 50 (would never flush at 4).
        batch: { wait: 60_000, size: 50 },
        mapping: {
          // wildcard rule carries its OWN batch with a much smaller size cap.
          '*': { '*': { batch: { wait: 60_000, size: 2 } } },
        },
      },
    };

    const { collector } = await startFlow({
      destinations: { d: { code: dest } },
    });

    // 4 events: with rule size=2 winning, the buffer flushes twice (2 + 2).
    // If config.batch's size=50 had won instead, zero flushes would occur.
    for (let i = 0; i < 4; i++) {
      await pushToDestinations(
        collector,
        makeEvent(i),
        { ingest: createIngest(`req-${i}`) },
        collector.destinations,
      );
    }

    // Rule bounds (size 2) drove two synchronous flushes without timer advance.
    expect(mockPushBatch).toHaveBeenCalledTimes(2);
    expect(batchSizes).toEqual([2, 2]);

    // Routing landed on the "* *" rule buffer, and the reserved default buffer
    // was NEVER created.
    const batches = collector.destinations['d'].batches;
    expect(batches).toBeDefined();
    expect(Object.keys(batches!)).toEqual(['* *']);
    expect(batches!['* *']).toBeDefined();
    expect(batches![' batch-all']).toBeUndefined();
    // The "* *" buffer is a rule buffer, not the config.batch default.
    expect(batches!['* *'].isDefault).toBe(false);
  });

  it('(d) config.batch + a matched non-wildcard rule with no batch routes to " batch-all" (rule undefined), still applying the rule data transform', async () => {
    // config.batch is set, plus a non-wildcard rule `page.view` that MATCHES
    // the event but has NO batch of its own (only a `data` transform).
    // For those events ruleHasBatch is false, so mappingKey = BATCH_ALL_KEY
    // (' batch-all'), the flush-context rule is undefined (isDefault buffer),
    // yet processed.data from the matched rule is still applied per entry.
    let capturedRule: Destination.PushBatchContext['rule'] | 'unset' = 'unset';
    const capturedData: Destination.Data[] = [];
    const mockPushBatch = jest.fn(
      (
        batch: Destination.Batch<unknown>,
        context: Destination.PushBatchContext,
      ) => {
        capturedRule = context.rule;
        for (const value of batch.data) capturedData.push(value);
      },
    );

    const dest: Destination.Instance = {
      type: 'config-batch-data-rule',
      push: jest.fn(),
      pushBatch: mockPushBatch,
      config: {
        init: true,
        // config.batch enables the destination-wide default buffer.
        batch: { wait: 60_000 },
        mapping: {
          // Non-wildcard rule that matches "page view"; data transform, no batch.
          page: { view: { data: { map: { foo: { value: 'bar' } } } } },
        },
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

    // The only buffer is the reserved default; no rule buffer was created.
    const batches = collector.destinations['d'].batches;
    expect(batches).toBeDefined();
    expect(Object.keys(batches!)).toEqual([' batch-all']);
    expect(batches![' batch-all'].isDefault).toBe(true);

    // Flush the default buffer (long wait, so no timer fires on its own).
    await batches![' batch-all'].flush();

    expect(mockPushBatch).toHaveBeenCalledTimes(1);
    // isDefault buffer => flush-context rule is undefined, NOT the matched rule.
    expect(capturedRule).toBeUndefined();
    // The matched rule's data transform was still applied to every batched event.
    expect(capturedData).toEqual([
      { foo: 'bar' },
      { foo: 'bar' },
      { foo: 'bar' },
    ]);
  });

  it('(config.batch-only) a rejecting pushBatch on the " batch-all" default buffer routes the whole batch to DLQ and increments failed', async () => {
    // config.batch set, NO rule batch: events land in the reserved default
    // buffer (' batch-all'). A plain rejecting pushBatch (throw, not a
    // BatchOutcome) must whole-batch-DLQ and count `failed`, proving DLQ
    // accounting works for the DEFAULT buffer, not only rule buffers.
    const mockPushBatch = jest.fn(() => {
      throw new Error('default buffer boom');
    });

    const dest: Destination.Instance = {
      type: 'config-batch-default-dlq',
      push: jest.fn(),
      pushBatch: mockPushBatch,
      config: {
        init: true,
        // config.batch only: no mapping rule carries batch.
        batch: { wait: 60_000 },
      },
    };

    const { collector } = await startFlow({
      destinations: { d: { code: dest } },
    });

    for (let i = 0; i < 4; i++) {
      await pushToDestinations(
        collector,
        makeEvent(i),
        { ingest: createIngest(`req-${i}`) },
        collector.destinations,
      );
    }

    const batches = collector.destinations['d'].batches;
    expect(batches).toBeDefined();
    expect(Object.keys(batches!)).toEqual([' batch-all']);

    await batches![' batch-all'].flush();

    // Whole batch routed to the DLQ as [event, error].
    const dlq = collector.destinations['d'].dlq;
    expect(dlq).toBeDefined();
    expect(dlq!.length).toBe(4);
    expect(dlq![0][0].id).toBe('e-0');
    const firstError = dlq![0][1];
    expect(firstError).toBeInstanceOf(Error);
    if (!(firstError instanceof Error)) throw new Error('expected Error');
    expect(firstError.message).toBe('default buffer boom');

    const destStatus = collector.status.destinations['d'];
    expect(destStatus.failed).toBe(4);
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
