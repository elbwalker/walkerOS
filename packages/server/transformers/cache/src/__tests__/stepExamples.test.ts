import type { Collector, Logger, Transformer, WalkerOS } from '@walkeros/core';
import type { RespondFn, RespondOptions } from '@walkeros/core';
import { transformerCache } from '../transformer';
import type { Types } from '../types';
import { examples } from '../dev';

describe('Step Examples', () => {
  const mockLogger: Logger.Instance = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    throw: jest.fn() as unknown as Logger.ThrowFn,
    json: jest.fn(),
    scope: jest.fn().mockReturnThis(),
  };

  const mockCollector = {} as Collector.Instance;

  const createInitContext = (
    config: Transformer.Config<Types>,
  ): Transformer.Context<Types> => ({
    collector: mockCollector,
    config,
    env: {} as Transformer.Env<Types>,
    logger: mockLogger,
    id: 'test-cache',
  });

  const createPushContext = (
    ingest: Record<string, unknown> = {},
    respond?: RespondFn,
  ): Transformer.Context<Types> => ({
    collector: mockCollector,
    config: {},
    env: respond ? { respond } : {},
    logger: mockLogger,
    id: 'test-cache',
    ingest,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.DeepPartialEvent;

    // All step examples use the same cache config with wildcard matching
    const transformer = await transformerCache(
      createInitContext({
        settings: {
          rules: [{ match: '*', key: ['method', 'path'], ttl: 60 }],
        },
      }),
    );

    const ingest = { method: 'GET', path: '/api/events' };

    if (name === 'cacheMiss') {
      // First request: cache miss → returns respond wrapper
      const result = await transformer.push(
        event,
        createPushContext(ingest, () => {}),
      );
      expect(result).toBeDefined();
      expect(result).not.toBe(false);
      expect((result as Transformer.Result).respond).toBeInstanceOf(Function);
    } else if (name === 'cacheHit') {
      // Prime the cache with a prior request
      const primeResult = await transformer.push(
        examples.step.cacheMiss.in as WalkerOS.DeepPartialEvent,
        createPushContext(ingest, () => {}),
      );
      (primeResult as Transformer.Result).respond!({
        body: 'cached',
        status: 200,
      });

      // Second request: cache hit → returns false
      let capturedOptions: RespondOptions | undefined;
      const respond: RespondFn = (options) => {
        capturedOptions = options;
      };
      const result = await transformer.push(
        event,
        createPushContext(ingest, respond),
      );
      expect(result).toBe(example.out);
      expect(capturedOptions).toBeDefined();
      expect(capturedOptions!.headers).toMatchObject({ 'X-Cache': 'HIT' });
    } else if (name === 'differentCacheKeys') {
      // Prime GET /api/events
      const primeResult = await transformer.push(
        examples.step.cacheMiss.in as WalkerOS.DeepPartialEvent,
        createPushContext(ingest, () => {}),
      );
      (primeResult as Transformer.Result).respond!({
        body: 'cached',
        status: 200,
      });

      // POST to same path → separate cache key → miss
      const postIngest = { method: 'POST', path: '/api/events' };
      const result = await transformer.push(
        event,
        createPushContext(postIngest, () => {}),
      );
      expect(result).toBeDefined();
      expect(result).not.toBe(false);
      expect((result as Transformer.Result).respond).toBeInstanceOf(Function);
    }
  });
});
