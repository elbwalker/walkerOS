import type {
  Collector,
  Destination,
  Transformer,
  WalkerOS,
} from '@walkeros/core';
import { createMockLogger, StepError } from '@walkeros/core';
import { runTransformerChain } from '../transformer';
import { startFlow } from '..';

/**
 * Transformer init error visibility: when transformerInit throws inside
 * runTransformerChain, the cause is reported once (cause line under the
 * transformer's step) AND `collector.status.failed` increments. The chain
 * stops for that copy and the failure travels in the chain result, so the
 * push answers `ok: false` instead of reading as a drop.
 */

function createTestCollector(
  overrides: Partial<Collector.Instance> = {},
): Collector.Instance {
  const mockLogger = createMockLogger();
  return {
    allowed: true,
    config: {
      globalsStatic: {},
      sessionStatic: {},
      queueMax: 1_000,
    },
    consent: {},
    custom: {},
    destinations: {},
    transformers: {},
    globals: {},
    hooks: {},
    observers: new Set(),
    logger: mockLogger,
    on: {},
    queue: [],
    round: 0,
    count: 0,
    session: undefined,
    timing: Date.now(),
    user: {},
    sources: {},
    push: jest.fn(),
    command: jest.fn(),
    status: {
      startedAt: 0,
      in: 0,
      out: 0,
      failed: 0,
      sources: {},
      destinations: {},
      dropped: {},
    },
    ...overrides,
  } as unknown as Collector.Instance;
}

describe('transformer init throws (Category A)', () => {
  test('logs cause and increments status.failed; chain stops', async () => {
    const collector = createTestCollector();
    const throwingTransformer: Transformer.Instance = {
      type: 'mock',
      config: {},
      push: jest.fn(),
      init: jest.fn(() => {
        throw new Error('init boom');
      }),
    };
    const transformers = { bad: throwingTransformer };
    collector.transformers = transformers;

    const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

    const result = await runTransformerChain(
      collector,
      transformers,
      ['bad'],
      event,
    );

    // Chain stops on init failure: event becomes null, downstream dropped.
    expect(result.copies).toEqual([]);

    // Pipeline failure counts.
    expect(collector.status.failed).toBe(1);

    expect(result.failure).toEqual({
      by: 'bad',
      reason: { code: 'transformer', message: 'init boom', retryable: false },
    });

    const errorCall = findLoggerError(collector, 'transformer init failed');
    expect(errorCall?.[1]).toEqual(
      expect.objectContaining({
        step: 'transformer.bad',
        error: 'init boom',
      }),
    );
  });

  test('the failure context serializes the message, not a blind empty error', async () => {
    const collector = createTestCollector();
    const throwingTransformer: Transformer.Instance = {
      type: 'mock',
      config: {},
      push: jest.fn(),
      init: jest.fn(() => {
        throw new Error('init boom');
      }),
    };
    collector.transformers = { bad: throwingTransformer };

    await runTransformerChain(collector, collector.transformers, ['bad'], {
      name: 'page view',
    });

    const context = findLoggerError(collector, 'transformer init failed')?.[1];

    expect(context).toEqual({
      step: 'transformer.bad',
      code: 'transformer',
      type: 'mock',
      retryable: false,
      error: 'init boom',
    });
    // A raw Error serializes to `"error":{}`, blanking the cause in the
    // output an operator reads.
    expect(JSON.stringify(context)).toContain('init boom');
  });
});

function sink(delivered: WalkerOS.Event[]): Destination.Instance {
  return {
    type: 'sink',
    config: {},
    push: async (event) => {
      delivered.push(event);
    },
  };
}

describe('transformer init contract (C7)', () => {
  it('an init returning false at runtime fails the push instead of stopping it silently', async () => {
    const delivered: WalkerOS.Event[] = [];
    const initFalse = (): false => false;
    const enrich: Transformer.Instance = {
      type: 'enrich',
      config: {},
      // @ts-expect-error init may no longer return false: the type rejects it, the runtime guard reports it
      init: initFalse,
      push: (event) => ({ event }),
    };
    const { elb } = await startFlow({
      next: 'enrich',
      transformers: { enrich: { code: async () => enrich } },
      destinations: { sink: { code: sink(delivered) } },
    });
    const r = await elb('page view');
    expect(r.ok).toBe(false);
    expect(r.dropped).toBeUndefined();
    expect(r.reason?.code).toBe('not-ready');
    expect(r.error).toContain('enrich');
    expect(delivered).toHaveLength(0);
  });

  it('an init throwing a StepError fails the push with its reason', async () => {
    const delivered: WalkerOS.Event[] = [];
    const enrich: Transformer.Instance = {
      type: 'enrich',
      config: {},
      init: () => {
        throw new StepError('Config settings salt missing', {
          code: 'config',
        });
      },
      push: (event) => ({ event }),
    };
    const { elb } = await startFlow({
      next: 'enrich',
      transformers: { enrich: { code: async () => enrich } },
      destinations: { sink: { code: sink(delivered) } },
    });
    const r = await elb('page view');
    expect(r.ok).toBe(false);
    expect(r.reason?.code).toBe('config');
    expect(delivered).toHaveLength(0);
  });
});

// --- helpers ---

function findLoggerError(
  collector: Collector.Instance,
  verb: string,
): unknown[] | undefined {
  const root = collector.logger as unknown as ReturnType<
    typeof createMockLogger
  >;
  const visited: Array<ReturnType<typeof createMockLogger>> = [root];
  for (let i = 0; i < visited.length; i++) {
    const node = visited[i];
    const errorMock = node.error as jest.Mock;
    const call = errorMock.mock.calls.find((args) => args[0] === verb);
    if (call) return call;
    if (node.scopedLoggers) visited.push(...node.scopedLoggers);
  }
  return undefined;
}
