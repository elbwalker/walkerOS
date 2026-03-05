import type { Collector, Logger, Transformer, WalkerOS } from '@walkeros/core';
import type { RespondFn, RespondOptions } from '@walkeros/core';
import { transformerCache } from '../transformer';
import type { CacheSettings } from '../types';

describe('Transformer Cache', () => {
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
    config: Transformer.Config<Transformer.Types<CacheSettings>>,
  ): Transformer.Context<Transformer.Types<CacheSettings>> => ({
    collector: mockCollector,
    config,
    env: {},
    logger: mockLogger,
    id: 'test-cache',
  });

  const createPushContext = (
    ingest: Record<string, unknown> = {},
    respond?: RespondFn,
  ): Transformer.Context<Transformer.Types<CacheSettings>> => ({
    collector: mockCollector,
    config: {},
    env: respond ? { respond } : {},
    logger: mockLogger,
    id: 'test-cache',
    ingest,
  });

  const baseEvent: WalkerOS.DeepPartialEvent = {
    name: 'page view',
    data: { url: '/home' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cache MISS', () => {
    it('should return respond wrapper on cache miss', async () => {
      const transformer = await transformerCache(
        createInitContext({
          settings: {
            rules: [{ match: '*', key: ['method', 'path'], ttl: 60 }],
          },
        }),
      );

      const result = await transformer.push(
        baseEvent,
        createPushContext({ method: 'GET', path: '/api/data' }),
      );

      expect(result).toBeDefined();
      expect(result).not.toBe(false);
      expect((result as Transformer.Result).respond).toBeInstanceOf(Function);
    });

    it('should add X-Cache: MISS header when downstream responds', async () => {
      const transformer = await transformerCache(
        createInitContext({
          settings: {
            rules: [{ match: '*', key: ['method', 'path'], ttl: 60 }],
          },
        }),
      );

      let capturedOptions: RespondOptions | undefined;
      const originalRespond: RespondFn = (options) => {
        capturedOptions = options;
      };

      const result = await transformer.push(
        baseEvent,
        createPushContext(
          { method: 'GET', path: '/api/data' },
          originalRespond,
        ),
      );

      // Simulate downstream calling the wrapped respond
      const wrappedRespond = (result as Transformer.Result).respond!;
      wrappedRespond({ body: 'response data', status: 200 });

      expect(capturedOptions).toBeDefined();
      expect(capturedOptions!.headers).toMatchObject({ 'X-Cache': 'MISS' });
      expect(capturedOptions!.body).toBe('response data');
    });
  });

  describe('Cache HIT', () => {
    it('should return false and call respond on cache hit', async () => {
      const transformer = await transformerCache(
        createInitContext({
          settings: {
            rules: [{ match: '*', key: ['method', 'path'], ttl: 60 }],
          },
        }),
      );

      const ingest = { method: 'GET', path: '/api/data' };

      // First call: MISS
      let capturedOptions: RespondOptions | undefined;
      const respond1: RespondFn = (options) => {
        capturedOptions = options;
      };
      const missResult = await transformer.push(
        baseEvent,
        createPushContext(ingest, respond1),
      );
      // Simulate downstream responding
      (missResult as Transformer.Result).respond!({
        body: 'cached response',
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      // Second call: HIT
      capturedOptions = undefined;
      const respond2: RespondFn = (options) => {
        capturedOptions = options;
      };
      const hitResult = await transformer.push(
        baseEvent,
        createPushContext(ingest, respond2),
      );

      expect(hitResult).toBe(false);
      expect(capturedOptions).toBeDefined();
      expect(capturedOptions!.headers).toMatchObject({ 'X-Cache': 'HIT' });
      expect(capturedOptions!.body).toBe('cached response');
    });
  });

  describe('Rule matching', () => {
    it('should passthrough when no rules match', async () => {
      const transformer = await transformerCache(
        createInitContext({
          settings: {
            rules: [
              {
                match: { key: 'method', operator: 'eq', value: 'POST' },
                key: ['method', 'path'],
                ttl: 60,
              },
            ],
          },
        }),
      );

      const result = await transformer.push(
        baseEvent,
        createPushContext({ method: 'GET', path: '/api/data' }),
      );

      // No match = passthrough (undefined/void)
      expect(result).toBeUndefined();
    });

    it('should use first matching rule', async () => {
      const transformer = await transformerCache(
        createInitContext({
          settings: {
            rules: [
              {
                match: { key: 'path', operator: 'prefix', value: '/api' },
                key: ['path'],
                ttl: 300,
                headers: { 'Cache-Control': 'max-age=300' },
              },
              {
                match: '*',
                key: ['method', 'path'],
                ttl: 60,
              },
            ],
          },
        }),
      );

      let capturedOptions: RespondOptions | undefined;
      const respond: RespondFn = (options) => {
        capturedOptions = options;
      };

      const result = await transformer.push(
        baseEvent,
        createPushContext({ method: 'GET', path: '/api/data' }, respond),
      );

      // Trigger respond to check headers from first rule
      (result as Transformer.Result).respond!({
        body: 'data',
        status: 200,
      });

      expect(capturedOptions!.headers).toMatchObject({
        'X-Cache': 'MISS',
        'Cache-Control': 'max-age=300',
      });
    });
  });

  describe('Cache key', () => {
    it('should use different cache keys for different methods', async () => {
      const transformer = await transformerCache(
        createInitContext({
          settings: {
            rules: [{ match: '*', key: ['method', 'path'], ttl: 60 }],
          },
        }),
      );

      // GET request
      const getResult = await transformer.push(
        baseEvent,
        createPushContext({ method: 'GET', path: '/api/data' }),
      );
      (getResult as Transformer.Result).respond!({
        body: 'get response',
        status: 200,
      });

      // POST request to same path — should be a MISS (different key)
      const postResult = await transformer.push(
        baseEvent,
        createPushContext({ method: 'POST', path: '/api/data' }),
      );

      expect(postResult).not.toBe(false); // MISS, not HIT
      expect((postResult as Transformer.Result).respond).toBeInstanceOf(
        Function,
      );
    });

    it('should warn and passthrough on empty key fields', async () => {
      const transformer = await transformerCache(
        createInitContext({
          settings: {
            rules: [{ match: '*', key: ['method', 'path'], ttl: 60 }],
          },
        }),
      );

      // Ingest with missing key fields
      const result = await transformer.push(baseEvent, createPushContext({}));

      expect(result).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('Rule headers', () => {
    it('should merge rule headers into MISS responses', async () => {
      const transformer = await transformerCache(
        createInitContext({
          settings: {
            rules: [
              {
                match: '*',
                key: ['path'],
                ttl: 60,
                headers: { 'X-Custom': 'value' },
              },
            ],
          },
        }),
      );

      let capturedOptions: RespondOptions | undefined;
      const respond: RespondFn = (options) => {
        capturedOptions = options;
      };

      const result = await transformer.push(
        baseEvent,
        createPushContext({ path: '/data' }, respond),
      );

      (result as Transformer.Result).respond!({
        body: 'data',
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });

      expect(capturedOptions!.headers).toMatchObject({
        'X-Cache': 'MISS',
        'X-Custom': 'value',
        'Content-Type': 'text/plain',
      });
    });

    it('should merge rule headers into HIT responses', async () => {
      const transformer = await transformerCache(
        createInitContext({
          settings: {
            rules: [
              {
                match: '*',
                key: ['path'],
                ttl: 60,
                headers: { 'X-Custom': 'value' },
              },
            ],
          },
        }),
      );

      const ingest = { path: '/data' };

      // MISS
      const missResult = await transformer.push(
        baseEvent,
        createPushContext(ingest, () => {}),
      );
      (missResult as Transformer.Result).respond!({
        body: 'data',
        status: 200,
      });

      // HIT
      let capturedOptions: RespondOptions | undefined;
      const respond: RespondFn = (options) => {
        capturedOptions = options;
      };

      await transformer.push(baseEvent, createPushContext(ingest, respond));

      expect(capturedOptions!.headers).toMatchObject({
        'X-Cache': 'HIT',
        'X-Custom': 'value',
      });
    });
  });

  describe('No respond function', () => {
    it('should still return wrapped respond on miss without env.respond', async () => {
      const transformer = await transformerCache(
        createInitContext({
          settings: {
            rules: [{ match: '*', key: ['path'], ttl: 60 }],
          },
        }),
      );

      const result = await transformer.push(
        baseEvent,
        createPushContext({ path: '/data' }),
      );

      expect(result).toBeDefined();
      expect((result as Transformer.Result).respond).toBeInstanceOf(Function);
    });
  });

  describe('Step examples (MISS→HIT cycle)', () => {
    it('should demonstrate MISS then HIT for same request', async () => {
      const transformer = await transformerCache(
        createInitContext({
          settings: {
            rules: [{ match: '*', key: ['method', 'path'], ttl: 60 }],
          },
        }),
      );

      const ingest = { method: 'GET', path: '/api/events' };

      // Step 1: MISS — returns respond wrapper
      const missResult = await transformer.push(
        { name: 'page view', data: { url: '/api/events' } },
        createPushContext(ingest, () => {}),
      );

      expect(missResult).toBeDefined();
      expect(missResult).not.toBe(false);
      expect((missResult as Transformer.Result).respond).toBeInstanceOf(
        Function,
      );

      // Simulate downstream responding (populates cache)
      (missResult as Transformer.Result).respond!({
        body: { events: [] },
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      // Step 2: HIT — returns false, calls respond with cached data
      let hitOptions: RespondOptions | undefined;
      const hitRespond: RespondFn = (options) => {
        hitOptions = options;
      };

      const hitResult = await transformer.push(
        { name: 'page view', data: { url: '/api/events' } },
        createPushContext(ingest, hitRespond),
      );

      expect(hitResult).toBe(false);
      expect(hitOptions).toBeDefined();
      expect(hitOptions!.body).toEqual({ events: [] });
      expect(hitOptions!.headers).toMatchObject({ 'X-Cache': 'HIT' });
    });

    it('should not serve cached response for different key', async () => {
      const transformer = await transformerCache(
        createInitContext({
          settings: {
            rules: [{ match: '*', key: ['method', 'path'], ttl: 60 }],
          },
        }),
      );

      // Cache a GET /api/events response
      const missResult = await transformer.push(
        { name: 'page view' },
        createPushContext({ method: 'GET', path: '/api/events' }, () => {}),
      );
      (missResult as Transformer.Result).respond!({
        body: 'cached',
        status: 200,
      });

      // Different path should be a MISS
      const differentResult = await transformer.push(
        { name: 'page view' },
        createPushContext({ method: 'GET', path: '/api/other' }),
      );

      expect(differentResult).not.toBe(false);
      expect((differentResult as Transformer.Result).respond).toBeInstanceOf(
        Function,
      );
    });
  });
});
