import type { Collector, Logger, Transformer, WalkerOS } from '@walkeros/core';
import type { RespondFn, RespondOptions } from '@walkeros/core';
import { createMockStore } from '@walkeros/store-memory';
import { transformerFile } from '../transformer';
import type { FileSettings, Types } from '../types';

describe('Transformer File', () => {
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
    env: Partial<Transformer.Env<Types>> = {},
  ): Transformer.Context<Types> => ({
    collector: mockCollector,
    config,
    env: env as Transformer.Env<Types>,
    logger: mockLogger,
    id: 'test-file',
  });

  const createPushContext = (
    ingest: Record<string, unknown> = {},
    respond?: RespondFn,
  ): Transformer.Context<Types> => ({
    collector: mockCollector,
    config: {},
    env: respond ? { respond } : {},
    logger: mockLogger,
    id: 'test-file',
    ingest,
  });

  const baseEvent: WalkerOS.DeepPartialEvent = { name: 'page view' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('File found', () => {
    it('should respond with content and correct Content-Type', async () => {
      const store = createMockStore<Buffer>();
      store.set('walker.js', Buffer.from('console.log("hi")'));

      const transformer = await transformerFile(
        createInitContext({ settings: {} }, { store }),
      );

      let capturedOptions: RespondOptions | undefined;
      const respond: RespondFn = (options) => {
        capturedOptions = options;
      };

      const result = await transformer.push(
        baseEvent,
        createPushContext({ path: '/walker.js' }, respond),
      );

      expect(result).toBe(false);
      expect(capturedOptions).toBeDefined();
      expect(capturedOptions!.status).toBe(200);
      expect(capturedOptions!.headers).toMatchObject({
        'Content-Type': 'application/javascript',
      });
      expect(capturedOptions!.headers!['Content-Length']).toBeDefined();
      expect(capturedOptions!.body).toEqual(Buffer.from('console.log("hi")'));
    });
  });

  describe('File not found', () => {
    it('should passthrough when file not in store', async () => {
      const store = createMockStore<Buffer>();

      const transformer = await transformerFile(
        createInitContext({ settings: {} }, { store }),
      );

      const result = await transformer.push(
        baseEvent,
        createPushContext({ path: '/missing.js' }),
      );

      expect(result).toBeUndefined();
    });
  });

  describe('No store', () => {
    it('should warn and passthrough when no store provided', async () => {
      const transformer = await transformerFile(
        createInitContext({ settings: {} }),
      );

      const result = await transformer.push(
        baseEvent,
        createPushContext({ path: '/walker.js' }),
      );

      expect(result).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('Prefix stripping', () => {
    it('should strip prefix and serve matching paths', async () => {
      const store = createMockStore<Buffer>();
      store.set('walker.js', Buffer.from('code'));

      const transformer = await transformerFile(
        createInitContext({ settings: { prefix: '/static' } }, { store }),
      );

      let capturedOptions: RespondOptions | undefined;
      const respond: RespondFn = (options) => {
        capturedOptions = options;
      };

      const result = await transformer.push(
        baseEvent,
        createPushContext({ path: '/static/walker.js' }, respond),
      );

      expect(result).toBe(false);
      expect(capturedOptions!.body).toEqual(Buffer.from('code'));
    });

    it('should passthrough for non-matching prefix', async () => {
      const store = createMockStore<Buffer>();

      const transformer = await transformerFile(
        createInitContext({ settings: { prefix: '/static' } }, { store }),
      );

      const result = await transformer.push(
        baseEvent,
        createPushContext({ path: '/api/data' }),
      );

      expect(result).toBeUndefined();
    });
  });

  describe('Custom headers', () => {
    it('should merge custom headers into response', async () => {
      const store = createMockStore<Buffer>();
      store.set('style.css', Buffer.from('body{}'));

      const transformer = await transformerFile(
        createInitContext(
          {
            settings: {
              headers: { 'Cache-Control': 'public, max-age=3600' },
            },
          },
          { store },
        ),
      );

      let capturedOptions: RespondOptions | undefined;
      const respond: RespondFn = (options) => {
        capturedOptions = options;
      };

      await transformer.push(
        baseEvent,
        createPushContext({ path: '/style.css' }, respond),
      );

      expect(capturedOptions!.headers).toMatchObject({
        'Content-Type': 'text/css',
        'Cache-Control': 'public, max-age=3600',
      });
    });
  });

  describe('Custom MIME types', () => {
    it('should use mimeTypes overrides', async () => {
      const store = createMockStore<Buffer>();
      store.set('module.xyz', Buffer.from('data'));

      const transformer = await transformerFile(
        createInitContext(
          { settings: { mimeTypes: { '.xyz': 'text/custom' } } },
          { store },
        ),
      );

      let capturedOptions: RespondOptions | undefined;
      const respond: RespondFn = (options) => {
        capturedOptions = options;
      };

      await transformer.push(
        baseEvent,
        createPushContext({ path: '/module.xyz' }, respond),
      );

      expect(capturedOptions!.headers!['Content-Type']).toBe('text/custom');
    });
  });

  describe('No ingest.path', () => {
    it('should passthrough when no path in ingest', async () => {
      const store = createMockStore<Buffer>();

      const transformer = await transformerFile(
        createInitContext({ settings: {} }, { store }),
      );

      const result = await transformer.push(baseEvent, createPushContext({}));

      expect(result).toBeUndefined();
    });
  });
});
