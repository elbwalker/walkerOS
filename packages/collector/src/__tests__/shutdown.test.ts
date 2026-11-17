import type {
  Destination,
  Logger,
  Source,
  Store,
  Transformer,
} from '@walkeros/core';
import {
  createEvent,
  Level,
  SHUTDOWN_DEADLINE_MS,
  StepError,
} from '@walkeros/core';
import { startFlow } from '..';

// Build a single-entry batch registry whose flush() behaviour is supplied by
// the test, so we can drive the fast-resolve and hang paths deterministically.
// `pending` events wait in it, as events a flush would deliver.
function makeBatches(
  flush: () => Promise<void>,
  pending = 0,
): NonNullable<Destination.Instance['batches']> {
  const batched: Destination.Instance['batches'] = {};
  const events = Array.from({ length: pending }, () => createEvent());
  return {
    default: {
      batched: {
        key: 'default',
        entries: events.map((event) => ({ event })),
        events,
        data: [],
      },
      batchFn: () => {},
      flush,
    },
  } satisfies typeof batched;
}

function never(): Promise<void> {
  return new Promise<void>(() => {});
}

// Capture only ERROR-level log messages via a custom logger handler.
function makeErrorCapture(): {
  messages: string[];
  handler: Logger.Handler;
} {
  const messages: string[] = [];
  // A cause line carries the failure's message in its context.
  const handler: Logger.Handler = (level, message, context) => {
    if (level === Level.ERROR)
      messages.push(
        typeof context.error === 'string'
          ? `${message}: ${context.error}`
          : message,
      );
  };
  return { messages, handler };
}

describe('shutdown command', () => {
  it('calls destroy on all destinations', async () => {
    const destroyFn = jest.fn();
    const { collector, elb } = await startFlow({});

    const dest: Destination.Instance = {
      config: { settings: { key: 'value' } },
      push: jest.fn(),
      type: 'test-dest',
      destroy: destroyFn,
    };
    collector.destinations['test'] = dest;

    await elb('walker shutdown');

    expect(destroyFn).toHaveBeenCalledTimes(1);
    expect(destroyFn).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test',
        config: expect.objectContaining({ settings: { key: 'value' } }),
        logger: expect.any(Object),
      }),
    );
  });

  it('calls destroy on all sources', async () => {
    const destroyFn = jest.fn();
    const { collector, elb } = await startFlow({});

    const src: Source.Instance = {
      type: 'express',
      config: {},
      push: jest.fn(),
      destroy: destroyFn,
    };
    collector.sources['express'] = src;

    await elb('walker shutdown');

    expect(destroyFn).toHaveBeenCalledTimes(1);
    expect(destroyFn).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'express',
        logger: expect.any(Object),
      }),
    );
  });

  it('calls destroy on all transformers', async () => {
    const destroyFn = jest.fn();
    const { collector, elb } = await startFlow({});

    const xfm: Transformer.Instance = {
      type: 'enricher',
      config: {},
      push: jest.fn(),
      destroy: destroyFn,
    };
    collector.transformers['enrich'] = xfm;

    await elb('walker shutdown');

    expect(destroyFn).toHaveBeenCalledTimes(1);
  });

  it('continues if one destroy throws', async () => {
    const failDestroy = jest.fn().mockRejectedValue(new Error('boom'));
    const okDestroy = jest.fn();
    const { collector, elb } = await startFlow({});

    const failDest: Destination.Instance = {
      config: {},
      push: jest.fn(),
      type: 'fail',
      destroy: failDestroy,
    };
    const okDest: Destination.Instance = {
      config: {},
      push: jest.fn(),
      type: 'ok',
      destroy: okDestroy,
    };
    collector.destinations['fail'] = failDest;
    collector.destinations['ok'] = okDest;

    await elb('walker shutdown');

    expect(failDestroy).toHaveBeenCalled();
    expect(okDestroy).toHaveBeenCalled();
  });

  it('skips steps without destroy', async () => {
    const { collector, elb } = await startFlow({});

    const dest: Destination.Instance = {
      config: {},
      push: jest.fn(),
      type: 'simple',
    };
    collector.destinations['nodestroy'] = dest;

    await elb('walker shutdown');
  });

  it('flushes pending destination batches on shutdown and answers ok', async () => {
    const mockPushBatch = jest.fn();
    const dest: Destination.Instance = {
      push: jest.fn(),
      pushBatch: mockPushBatch,
      config: { init: true, batch: { wait: 60_000 } }, // wait long; only shutdown can flush
    };
    const { elb } = await startFlow({ destinations: { d: { code: dest } } });
    await elb('page view');
    expect(mockPushBatch).not.toHaveBeenCalled(); // still buffered

    const result = await elb('walker shutdown');
    expect(mockPushBatch).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    expect(result.failed).toBeUndefined();
  });

  it('is idempotent: a second shutdown does not re-destroy or throw', async () => {
    const destDestroy = jest.fn();
    const storeDestroy = jest.fn();
    const { collector, elb } = await startFlow({});

    const dest: Destination.Instance = {
      config: {},
      push: jest.fn(),
      type: 'test-dest',
      destroy: destDestroy,
    };
    collector.destinations['test'] = dest;
    const store: Store.Instance = {
      type: 'memory',
      config: {},
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      destroy: storeDestroy,
    };
    collector.stores['kv'] = store;

    await elb('walker shutdown');
    // Second shutdown must be a clean no-op: never throws, never re-destroys.
    await expect(elb('walker shutdown')).resolves.toEqual({ ok: true });

    expect(destDestroy).toHaveBeenCalledTimes(1);
    expect(storeDestroy).toHaveBeenCalledTimes(1);
  });

  it('respects shutdown order: sources before destinations before transformers', async () => {
    const order: string[] = [];
    const { collector, elb } = await startFlow({});

    const http: Source.Instance = {
      type: 'express',
      config: {},
      push: jest.fn(),
      destroy: jest.fn().mockImplementation(() => {
        order.push('source');
      }),
    };
    const db: Destination.Instance = {
      config: {},
      push: jest.fn(),
      type: 'bigquery',
      destroy: jest.fn().mockImplementation(() => {
        order.push('destination');
      }),
    };
    const enrich: Transformer.Instance = {
      type: 'enricher',
      config: {},
      push: jest.fn(),
      destroy: jest.fn().mockImplementation(() => {
        order.push('transformer');
      }),
    };
    collector.sources['http'] = http;
    collector.destinations['db'] = db;
    collector.transformers['enrich'] = enrich;

    await elb('walker shutdown');

    expect(order).toEqual(['source', 'destination', 'transformer']);
  });

  describe('the shutdown deadline', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('clears the flush timeout when batch flush resolves fast', async () => {
      const { collector, elb } = await startFlow({});

      const dest: Destination.Instance = {
        config: {},
        push: jest.fn(),
        type: 'test-dest',
        batches: makeBatches(() => Promise.resolve()),
      };
      collector.destinations['fast'] = dest;

      await elb('walker shutdown');

      expect(jest.getTimerCount()).toBe(0);
    });

    it('clears the destroy timeout when destroy resolves fast', async () => {
      const { collector, elb } = await startFlow({});

      const dest: Destination.Instance = {
        config: {},
        push: jest.fn(),
        type: 'test-dest',
        destroy: jest.fn(() => Promise.resolve()),
      };
      collector.destinations['fast'] = dest;

      await elb('walker shutdown');

      expect(jest.getTimerCount()).toBe(0);
    });

    it.each<
      [
        string,
        Pick<Destination.Instance, 'batches' | 'destroy'>,
        string,
        Destination.Ref['phase'],
        RegExp,
      ]
    >([
      [
        'a pending batch flush never settles',
        { batches: makeBatches(never, 1) },
        'timeout',
        'flush',
        /destination 'hang' batch flush timed out/,
      ],
      [
        'a pending batch flush rejects',
        {
          batches: makeBatches(
            () =>
              Promise.reject(
                new StepError('vendor down', { code: 'transport' }),
              ),
            1,
          ),
        },
        'transport',
        'flush',
        /vendor down/,
      ],
      [
        'its destroy never settles',
        { destroy: never },
        'timeout',
        'destroy',
        /destination 'hang' destroy timed out/,
      ],
      [
        'its destroy throws',
        { destroy: () => Promise.reject(new Error('socket closed')) },
        'transport',
        'destroy',
        /destination 'hang' destroy failed: Error: socket closed/,
      ],
      [
        'its pending batch never flushes and its destroy throws',
        {
          batches: makeBatches(never, 1),
          destroy: () => Promise.reject(new Error('socket closed')),
        },
        'timeout',
        'flush',
        /destination 'hang' batch flush timed out/,
      ],
    ])(
      'answers ok: false naming the destination when %s',
      async (_case, parts, code, phase, line) => {
        const { messages, handler } = makeErrorCapture();
        const { collector, elb } = await startFlow({ logger: { handler } });
        collector.destinations['hang'] = {
          config: {},
          push: jest.fn(),
          type: 'test-dest',
          ...parts,
        };

        const shutdown = elb('walker shutdown');
        await jest.advanceTimersByTimeAsync(SHUTDOWN_DEADLINE_MS);
        const result = await shutdown;

        expect(result.ok).toBe(false);
        expect(result.failed?.hang?.reason?.code).toBe(code);
        expect(result.failed?.hang?.phase).toBe(phase);
        expect(messages.some((m) => line.test(m))).toBe(true);
        expect(jest.getTimerCount()).toBe(0);
      },
    );

    it('ends the whole shutdown at the deadline when a source, a flush and a destroy all hang', async () => {
      const { collector, elb } = await startFlow({});
      collector.sources['http'] = {
        type: 'express',
        config: {},
        push: jest.fn(),
        destroy: never,
      };
      collector.destinations['hang'] = {
        config: {},
        push: jest.fn(),
        type: 'test-dest',
        batches: makeBatches(never, 1),
        destroy: never,
      };

      let done = false;
      const shutdown = elb('walker shutdown').then((result) => {
        done = true;
        return result;
      });
      await jest.advanceTimersByTimeAsync(SHUTDOWN_DEADLINE_MS - 1);
      expect(done).toBe(false);
      await jest.advanceTimersByTimeAsync(1);

      expect(done).toBe(true);
      expect((await shutdown).failed?.hang?.reason?.code).toBe('timeout');
      expect(jest.getTimerCount()).toBe(0);
    });

    it('names no empty batch and logs no cause line for it when a source used the deadline', async () => {
      const { messages, handler } = makeErrorCapture();
      const { collector, elb } = await startFlow({ logger: { handler } });
      collector.sources['http'] = {
        type: 'express',
        config: {},
        push: jest.fn(),
        destroy: never,
      };
      collector.destinations['idle'] = {
        config: {},
        push: jest.fn(),
        type: 'test-dest',
        // An idle batch's flush still takes a few microtasks.
        batches: makeBatches(async () => {
          await Promise.resolve();
        }),
      };

      const shutdown = elb('walker shutdown');
      await jest.advanceTimersByTimeAsync(SHUTDOWN_DEADLINE_MS);
      const result = await shutdown;

      expect(result.failed?.idle).toBeUndefined();
      expect(messages.some((m) => /batch flush/.test(m))).toBe(false);
    });

    it('names a destination whose size fire is still in flight at the deadline', async () => {
      const { messages, handler } = makeErrorCapture();
      const dest: Destination.Instance = {
        push: jest.fn(),
        pushBatch: never,
        config: { init: true, batch: { wait: 60_000, size: 1 } },
      };
      const { elb } = await startFlow({
        destinations: { d: { code: dest } },
        logger: { handler },
      });
      await elb('page view');

      const shutdown = elb('walker shutdown');
      await jest.advanceTimersByTimeAsync(SHUTDOWN_DEADLINE_MS);
      const result = await shutdown;

      expect(result.failed?.d?.reason?.code).toBe('timeout');
      expect(result.failed?.d?.phase).toBe('flush');
      expect(messages.filter((m) => /batch flush/.test(m))).toHaveLength(1);
    });

    it('gives each batch of a walker flush its own 5 s', async () => {
      const { collector, elb } = await startFlow({});
      collector.destinations['hang'] = {
        config: {},
        push: jest.fn(),
        type: 'test-dest',
        batches: makeBatches(never, 1),
      };

      let done = false;
      const flush = elb('walker flush').then((result) => {
        done = true;
        return result;
      });
      await jest.advanceTimersByTimeAsync(4999);
      expect(done).toBe(false);
      await jest.advanceTimersByTimeAsync(1);

      expect(done).toBe(true);
      const result = await flush;
      expect(result.failed?.hang?.reason?.code).toBe('timeout');
      expect(result.failed?.hang?.phase).toBeUndefined();
    });

    it('isolates a slow destination: fast one flushes, slow one times out independently', async () => {
      const { messages, handler } = makeErrorCapture();
      const { collector, elb } = await startFlow({ logger: { handler } });

      let fastFlushed = false;
      const fast: Destination.Instance = {
        config: {},
        push: jest.fn(),
        type: 'fast',
        batches: makeBatches(async () => {
          fastFlushed = true;
        }, 1),
      };
      const slow: Destination.Instance = {
        config: {},
        push: jest.fn(),
        type: 'slow',
        batches: makeBatches(never, 1),
      };
      collector.destinations['fast'] = fast;
      collector.destinations['slow'] = slow;

      const shutdown = elb('walker shutdown');
      // Drive the slow destination to its timeout; the fast one resolved already.
      await jest.advanceTimersByTimeAsync(SHUTDOWN_DEADLINE_MS);
      const result = await shutdown; // resolves even though one destination hung

      // Fast destination completed its flush within budget.
      expect(fastFlushed).toBe(true);
      expect(result.done?.fast).toBeDefined();
      expect(result.failed?.slow?.phase).toBe('flush');
      // Slow destination timed out independently, without blocking the fast one.
      expect(
        messages.some((m) =>
          /destination 'slow' batch flush timed out/.test(m),
        ),
      ).toBe(true);
      expect(
        messages.some((m) =>
          /destination 'fast' batch flush timed out/.test(m),
        ),
      ).toBe(false);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('empty-batch shutdown is a clean no-op for a destination with zero buffered entries', async () => {
      const { messages, handler } = makeErrorCapture();
      const { collector, elb } = await startFlow({ logger: { handler } });

      // Batch registry present, but the single batch has zero buffered entries
      // and a flush that resolves immediately (nothing to send).
      let flushCalls = 0;
      const dest: Destination.Instance = {
        config: {},
        push: jest.fn(),
        type: 'empty',
        batches: makeBatches(async () => {
          flushCalls++;
        }),
      };
      collector.destinations['empty'] = dest;

      await expect(elb('walker shutdown')).resolves.toBeDefined();

      // Flush ran and resolved cleanly; no error logged, no timer leaked.
      expect(flushCalls).toBe(1);
      expect(messages).toEqual([]);
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
