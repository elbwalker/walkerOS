import type { Collector, Transformer, WalkerOS } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { runTransformerChain } from '../transformer';

/**
 * Transformer init error visibility: when transformerInit throws inside
 * runTransformerChain, the outer tryCatchAsync wrap MUST log the original
 * cause via the scoped logger AND increment `collector.status.failed`
 * (Category A - internal pipeline failure). Downstream behavior is
 * unchanged: the chain stops, the event is dropped.
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
    expect(result.event).toBeNull();

    // Pipeline failure counts.
    expect(collector.status.failed).toBe(1);

    const errorCall = findLoggerError(collector, 'transformer init failed');
    expect(errorCall).toBeDefined();
    expect(errorCall?.[1]).toEqual(
      expect.objectContaining({
        transformer: 'bad',
        error: expect.any(Error),
      }),
    );
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
