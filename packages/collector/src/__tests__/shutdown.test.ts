import type { Destination, Logger, Source, Transformer } from '@walkeros/core';
import { Level } from '@walkeros/core';
import { startFlow } from '..';

// Build a single-entry batch registry whose flush() behaviour is supplied by
// the test, so we can drive the fast-resolve and hang paths deterministically.
function makeBatches(
  flush: () => Promise<void>,
): NonNullable<Destination.Instance['batches']> {
  const batched: Destination.Instance['batches'] = {};
  return {
    default: {
      batched: { key: 'default', entries: [], events: [], data: [] },
      batchFn: () => {},
      flush,
    },
  } satisfies typeof batched;
}

// Capture only ERROR-level log messages via a custom logger handler.
function makeErrorCapture(): {
  messages: string[];
  handler: Logger.Handler;
} {
  const messages: string[] = [];
  const handler: Logger.Handler = (level, message) => {
    if (level === Level.ERROR) messages.push(message);
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

  it('flushes pending destination batches on shutdown', async () => {
    const mockPushBatch = jest.fn();
    const dest: Destination.Instance = {
      push: jest.fn(),
      pushBatch: mockPushBatch,
      config: { init: true, batch: { wait: 60_000 } }, // wait long; only shutdown can flush
    };
    const { elb } = await startFlow({ destinations: { d: { code: dest } } });
    await elb('page view');
    expect(mockPushBatch).not.toHaveBeenCalled(); // still buffered

    await elb('walker shutdown');
    expect(mockPushBatch).toHaveBeenCalledTimes(1);
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

  describe('timeout guards do not leak timers', () => {
    const STEP_TIMEOUT = 5000;

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

    it('times out and is caught when batch flush hangs', async () => {
      const { messages, handler } = makeErrorCapture();
      const { collector, elb } = await startFlow({ logger: { handler } });

      const dest: Destination.Instance = {
        config: {},
        push: jest.fn(),
        type: 'test-dest',
        batches: makeBatches(() => new Promise<void>(() => {})),
      };
      collector.destinations['hang'] = dest;

      const shutdown = elb('walker shutdown');
      await jest.advanceTimersByTimeAsync(STEP_TIMEOUT);
      await shutdown; // resolves, does not hang

      expect(
        messages.some((m) =>
          /destination 'hang' batch flush timed out/.test(m),
        ),
      ).toBe(true);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('times out and is caught when destroy hangs', async () => {
      const { messages, handler } = makeErrorCapture();
      const { collector, elb } = await startFlow({ logger: { handler } });

      const dest: Destination.Instance = {
        config: {},
        push: jest.fn(),
        type: 'test-dest',
        destroy: jest.fn(() => new Promise<void>(() => {})),
      };
      collector.destinations['hang'] = dest;

      const shutdown = elb('walker shutdown');
      await jest.advanceTimersByTimeAsync(STEP_TIMEOUT);
      await shutdown; // resolves, does not hang

      expect(
        messages.some((m) => /destination 'hang' destroy timed out/.test(m)),
      ).toBe(true);
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
