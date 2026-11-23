import type {
  Collector,
  Destination,
  Logger,
  Source,
  Transformer,
} from '@walkeros/core';
import {
  DEFAULT_DESTINATION_TIMEOUT_MS,
  Level,
  SHUTDOWN_DEADLINE_MS,
} from '@walkeros/core';
import { startFlow } from '..';

type TestSource = Source.Types<unknown, unknown, Collector.PushFn>;

interface Gate {
  promise: Promise<void>;
  open: () => void;
}

function gate(): Gate {
  let open: () => void = () => undefined;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { promise, open };
}

function never(): Promise<void> {
  return new Promise<void>(() => undefined);
}

interface ErrorLine {
  message: string;
  context: Record<string, unknown>;
}

function errorLines(): { lines: ErrorLine[]; handler: Logger.Handler } {
  const lines: ErrorLine[] = [];
  const handler: Logger.Handler = (level, message, context) => {
    if (level === Level.ERROR) lines.push({ message, context });
  };
  return { lines, handler };
}

/** A source that hands the test its context, so the test pushes through it. */
function capturingSource(): {
  code: Source.Init<TestSource>;
  context: () => Source.Context<TestSource>;
} {
  let captured: Source.Context<TestSource> | undefined;
  const code: Source.Init<TestSource> = (context) => {
    captured = context;
    return { type: 'test', config: {}, push: context.env.push };
  };
  const context = (): Source.Context<TestSource> => {
    if (!captured) throw new Error('the source did not start');
    return captured;
  };
  return { code, context };
}

/** A destination whose send waits for `sending`, recording send and destroy. */
function slowDestination(sending: Promise<void>): {
  code: Destination.Instance;
  entered: Promise<void>;
  order: string[];
} {
  const order: string[] = [];
  const entered = gate();
  const code: Destination.Instance = {
    type: 'slow',
    config: {},
    push: async () => {
      entered.open();
      await sending;
      order.push('sent');
    },
    destroy: () => {
      order.push('destroyed');
    },
  };
  return { code, entered: entered.promise, order };
}

function recordingDestination(): {
  code: Destination.Instance;
  received: string[];
} {
  const received: string[] = [];
  return {
    code: {
      type: 'recording',
      config: {},
      push: (event) => {
        received.push(event.name);
      },
    },
    received,
  };
}

describe('shutdown with pushes in flight', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('awaits a push whose destination is still sending, then closes the destination', async () => {
    const sending = gate();
    const destination = slowDestination(sending.promise);
    const { collector } = await startFlow({
      destinations: { d: { code: destination.code } },
    });

    const push = collector.push({ name: 'page view' });
    await destination.entered;
    const shutdown = collector.command('shutdown');
    // A shutdown that did not wait would have closed the destination by now.
    await jest.advanceTimersByTimeAsync(1000);
    sending.open();
    const [pushResult, shutdownResult] = await Promise.all([push, shutdown]);

    expect(destination.order).toEqual(['sent', 'destroyed']);
    expect(pushResult.ok).toBe(true);
    expect(shutdownResult.ok).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('delivers a source push whose before chain is still running when the shutdown starts', async () => {
    const source = capturingSource();
    const destination = recordingDestination();
    const transforming = gate();
    const entered = gate();
    const transformer: Transformer.Init = (context) => ({
      type: 'wait',
      config: context.config,
      push: async (event) => {
        entered.open();
        await transforming.promise;
        return { event };
      },
    });
    const { collector } = await startFlow({
      sources: { s: { code: source.code, before: 'wait' } },
      transformers: { wait: { code: transformer } },
      destinations: { d: { code: destination.code } },
    });

    const push = source.context().env.push({ name: 'page view' });
    await entered.promise;
    const shutdown = collector.command('shutdown');
    expect(collector.hasShutdown).toBe(true);
    transforming.open();
    const [pushResult, shutdownResult] = await Promise.all([push, shutdown]);

    expect(destination.received).toEqual(['page view']);
    expect(pushResult.ok).toBe(true);
    expect(shutdownResult.ok).toBe(true);
  });

  it('refuses a push after the shutdown began as a retryable shutting-down', async () => {
    const { lines, handler } = errorLines();
    const destination = recordingDestination();
    const { collector } = await startFlow({
      logger: { handler },
      destinations: { d: { code: destination.code } },
    });
    const failed = collector.status.failed;

    const shutdown = collector.command('shutdown');
    const result = await collector.push({ name: 'page view' });
    await shutdown;

    expect(result).toEqual({
      ok: false,
      reason: {
        code: 'shutting-down',
        message: expect.any(String),
        retryable: true,
      },
      error: expect.any(String),
    });
    expect(collector.status.failed).toBe(failed + 1);
    expect(lines).toEqual([
      {
        message: expect.stringMatching(/^Push refused/),
        context: expect.objectContaining({
          step: 'collector',
          code: 'shutting-down',
          event: 'page view',
        }),
      },
    ]);
    expect(destination.received).toEqual([]);
  });

  it.each<[string, (context: Source.Context<TestSource>) => Promise<unknown>]>([
    ['env.push', (context) => context.env.push({ name: 'page view' })],
    [
      'withScope',
      (context) =>
        context.withScope(undefined, undefined, (env) =>
          env.push({ name: 'page view' }),
        ),
    ],
  ])(
    'refuses a source push through %s after the shutdown began, before its before chain',
    async (_way, push) => {
      const { lines, handler } = errorLines();
      const source = capturingSource();
      const destination = recordingDestination();
      const before = jest.fn();
      const transformer: Transformer.Init = (context) => ({
        type: 'before',
        config: context.config,
        push: (event) => {
          before();
          return { event };
        },
      });
      const { collector } = await startFlow({
        logger: { handler },
        sources: { s: { code: source.code, before: 'before' } },
        transformers: { before: { code: transformer } },
        destinations: { d: { code: destination.code } },
      });
      const failed = collector.status.failed;

      const shutdown = collector.command('shutdown');
      const result = await push(source.context());
      await shutdown;

      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          reason: expect.objectContaining({
            code: 'shutting-down',
            retryable: true,
          }),
        }),
      );
      expect(collector.status.failed).toBe(failed + 1);
      expect(lines).toHaveLength(1);
      expect(before).not.toHaveBeenCalled();
      expect(destination.received).toEqual([]);
    },
  );

  it('answers timeout naming the pushes still running at the deadline', async () => {
    const { lines, handler } = errorLines();
    const entered = gate();
    const { collector } = await startFlow({
      logger: { handler },
      destinations: {
        d: {
          code: {
            type: 'hang',
            config: {},
            push: () => {
              entered.open();
              return never();
            },
          },
        },
      },
    });

    const push = collector.push({ name: 'page view' });
    await entered.promise;
    const shutdown = collector.command('shutdown');
    await jest.advanceTimersByTimeAsync(SHUTDOWN_DEADLINE_MS);
    const result = await shutdown;

    expect(result.ok).toBe(false);
    expect(result.reason).toEqual({
      code: 'timeout',
      message: '1 push still running at the shutdown deadline',
      retryable: true,
    });
    expect(lines.filter((line) => line.context.code === 'timeout')).toEqual([
      expect.objectContaining({
        context: expect.objectContaining({
          step: 'collector',
          error: '1 push still running at the shutdown deadline',
        }),
      }),
    ]);
    // The delivery ends by its own timeout, after the deadline.
    await jest.advanceTimersByTimeAsync(DEFAULT_DESTINATION_TIMEOUT_MS);
    await push;
    expect(jest.getTimerCount()).toBe(0);
  });

  it('settles the wait once a source push and the collector push it makes are done', async () => {
    const source = capturingSource();
    const sending = gate();
    const destination = slowDestination(sending.promise);
    const { collector } = await startFlow({
      sources: { s: { code: source.code } },
      destinations: { d: { code: destination.code } },
    });

    const push = source.context().env.push({ name: 'page view' });
    await destination.entered;
    const shutdown = collector.command('shutdown');
    await jest.advanceTimersByTimeAsync(1000);
    sending.open();
    const [pushResult, shutdownResult] = await Promise.all([push, shutdown]);

    expect(destination.order).toEqual(['sent', 'destroyed']);
    expect(pushResult.ok).toBe(true);
    expect(shutdownResult.ok).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });
});
