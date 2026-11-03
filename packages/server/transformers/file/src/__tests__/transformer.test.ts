import type { Transformer, WalkerOS } from '@walkeros/core';
import type { RespondFn, RespondOptions } from '@walkeros/core';
import {
  createIngest,
  createMockContext,
  createMockLogger,
} from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { transformerFile } from '../transformer';
import type { FileEnv, Types } from '../types';
import { createFailingStore, createMockStore, serve } from './serve';

const notFound: RespondOptions = {
  status: 404,
  body: { success: false, error: 'Not found' },
  headers: { 'Cache-Control': 'no-store' },
};

const unavailable: RespondOptions = {
  status: 503,
  body: { success: false, error: 'Service unavailable' },
  headers: { 'Cache-Control': 'no-store' },
};

describe('Transformer File', () => {
  const mockLogger = createMockLogger();

  const createInitContext = (
    config: Transformer.Config<Types>,
    env: FileEnv = { store: createMockStore() },
  ) =>
    createMockContext<Types>({
      config,
      env,
      logger: mockLogger,
      id: 'test-file',
    });

  const createPushContext = (
    ingestData: Record<string, unknown> = {},
    respond?: RespondFn,
  ) =>
    createMockContext<Types>({
      config: {},
      env: respond ? { respond } : {},
      logger: mockLogger,
      id: 'test-file',
      ingest: {
        ...createIngest('test'),
        ...ingestData,
        _meta: createIngest('test')._meta,
      },
    });

  /** A respond that records every answer it is given. */
  const recordAnswers = () => {
    const answers: (RespondOptions | undefined)[] = [];
    const respond: RespondFn = (options) => {
      answers.push(options);
    };
    return { answers, respond };
  };

  const baseEvent: WalkerOS.DeepPartialEvent = { name: 'page view' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('File found', () => {
    it('should respond with content and correct Content-Type', async () => {
      const store = createMockStore();
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

  describe('Ownership', () => {
    it('answers 404 for a missing file inside its prefix', async () => {
      const transformer = await transformerFile(
        createInitContext({
          settings: {
            prefix: '/static',
            headers: { 'Cache-Control': 'public, max-age=3600' },
          },
        }),
      );
      const { answers, respond } = recordAnswers();

      const result = await transformer.push(
        baseEvent,
        createPushContext({ path: '/static/missing.js' }, respond),
      );

      expect(answers).toEqual([notFound]);
      expect(result).toBe(false);
    });

    it('owns every routed path with prefix "/"', async () => {
      const transformer = await transformerFile(
        createInitContext({ settings: { prefix: '/' } }),
      );
      const { answers, respond } = recordAnswers();

      const result = await transformer.push(
        baseEvent,
        createPushContext({ path: '/walker.js' }, respond),
      );

      expect(answers).toEqual([notFound]);
      expect(result).toBe(false);
    });

    it('passes a miss on without a prefix', async () => {
      const transformer = await transformerFile(
        createInitContext({ settings: {} }),
      );
      const { answers, respond } = recordAnswers();

      const result = await transformer.push(
        baseEvent,
        createPushContext({ path: '/missing.js' }, respond),
      );

      expect(answers).toEqual([]);
      expect(result).toBeUndefined();
    });

    it('passes a path outside its prefix on', async () => {
      const transformer = await transformerFile(
        createInitContext({ settings: { prefix: '/static' } }),
      );
      const { answers, respond } = recordAnswers();

      const result = await transformer.push(
        baseEvent,
        createPushContext({ path: '/api/data' }, respond),
      );

      expect(answers).toEqual([]);
      expect(result).toBeUndefined();
    });
  });

  describe('Store failure', () => {
    it('answers 503 and rethrows when the store read fails', async () => {
      const error = new Error('bucket unreachable');
      const transformer = await transformerFile(
        createInitContext(
          {
            settings: {
              prefix: '/static',
              headers: { 'Cache-Control': 'public, max-age=3600' },
            },
          },
          { store: createFailingStore(error) },
        ),
      );
      const { answers, respond } = recordAnswers();

      await expect(
        transformer.push(
          baseEvent,
          createPushContext({ path: '/static/walker.js' }, respond),
        ),
      ).rejects.toBe(error);
      expect(answers).toEqual([unavailable]);
    });
  });

  describe('Prefix stripping', () => {
    it('should strip prefix and serve matching paths', async () => {
      const store = createMockStore();
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
  });

  describe('Custom headers', () => {
    it('should merge custom headers into response', async () => {
      const store = createMockStore();
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
      const store = createMockStore();
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
      const transformer = await transformerFile(
        createInitContext({ settings: {} }),
      );

      const result = await transformer.push(baseEvent, createPushContext({}));

      expect(result).toBeUndefined();
    });
  });
});

describe('Transformer File on a real collector', () => {
  it('answers 503, writes the cause line at ERROR and fails the push when the store read fails', async () => {
    const flow = await serve(
      { prefix: '/' },
      createFailingStore(new Error('bucket unreachable')),
    );

    const { result, answers } = await flow.request('/walker.js');

    expect(answers).toEqual([unavailable]);
    expect(result.ok).toBe(false);
    expect(flow.errors()).toEqual([
      expect.objectContaining({ step: 'transformer.file' }),
    ]);
  });

  it.each([
    ['missing', undefined],
    ['an unresolved $store reference', '$store.files'],
    ['an object without get', {}],
  ])('refuses to start without a usable store (%s)', async (_, store) => {
    await expect(
      startFlow({
        transformers: {
          file: { code: transformerFile, env: { store } },
        },
      }),
    ).rejects.toMatchObject({
      name: 'StepError',
      code: 'config',
      message: 'Config env store missing',
    });
  });
});
