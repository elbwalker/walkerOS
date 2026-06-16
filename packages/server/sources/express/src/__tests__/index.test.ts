import { sourceExpress } from '../index';
import type { EventRequest, Types } from '../types';
import type { Ingest, WalkerOS, Source, Collector } from '@walkeros/core';
import { createIngest, createMockLogger } from '@walkeros/core';
import type { Request, Response } from 'express';
import { examples } from '../dev';

// Helper to create source context
function createSourceContext(
  config: Partial<Source.Config<Types>> = {},
  env: Partial<Types['env']> = {},
): Source.Context<Types> {
  const baseEnv = env as Types['env'];
  return {
    config,
    env: baseEnv,
    logger: env.logger || createMockLogger(),
    id: 'test-express',
    collector: {} as Collector.Instance,
    reportError: () => undefined,
    // Minimal withScope stub: forwards body with a scope env that delegates
    // push back to env.push so the test's mockPush still captures the call.
    withScope: async (_raw, respond, body) => {
      const ingest: Ingest = createIngest('test-express');
      return body({
        ...baseEnv,
        push: baseEnv.push,
        ingest,
        respond,
      });
    },
  };
}

// Mock request/response for testing
function createMockRequest(options: {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Request {
  const headers = options.headers || {};
  return {
    method: options.method || 'POST',
    url: options.url || '/',
    body: options.body,
    headers,
    get: (name: string) => headers[name.toLowerCase()],
  } as Request;
}

function createMockResponse(): Response & {
  statusCode?: number;
  responseBody?: unknown;
  responseHeaders?: Record<string, string>;
} {
  const mockResponse: Record<string, unknown> = {
    statusCode: 200,
    responseBody: null,
    responseHeaders: {},

    status: jest.fn((code: number) => {
      mockResponse.statusCode = code;
      return mockResponse;
    }),

    json: jest.fn((body: unknown) => {
      mockResponse.responseBody = body;
      return mockResponse;
    }),

    send: jest.fn((body?: unknown) => {
      if (body !== undefined) {
        mockResponse.responseBody = body;
      }
      return mockResponse;
    }),

    set: jest.fn((key: string, value: string) => {
      (mockResponse.responseHeaders as Record<string, string>)[key] = value;
      return mockResponse;
    }),
  };

  return mockResponse as unknown as Response & {
    statusCode?: number;
    responseBody?: unknown;
    responseHeaders?: Record<string, string>;
  };
}

describe('sourceExpress', () => {
  let mockPush: jest.MockedFunction<(...args: unknown[]) => unknown>;
  let mockCommand: jest.MockedFunction<(...args: unknown[]) => unknown>;

  beforeEach(() => {
    mockPush = jest.fn().mockResolvedValue({
      event: { id: 'test-id' },
      ok: true,
    });
    mockCommand = jest.fn().mockResolvedValue({
      ok: true,
    });
  });

  describe('initialization', () => {
    it('should initialize with default settings', async () => {
      const source = await sourceExpress(
        createSourceContext(
          {},
          {
            push: mockPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      expect(source.type).toBe('express');
      expect(source.config.settings).toEqual({
        paths: ['/collect'],
        cors: true,
      });
      expect(typeof source.push).toBe('function');
      expect(source.app).toBeDefined();
      expect(source.server).toBeUndefined(); // No port = no server
    });

    it('should merge custom settings with defaults', async () => {
      const source = await sourceExpress(
        createSourceContext(
          {
            settings: {
              paths: ['/events'],
              cors: false,
            },
          },
          {
            push: mockPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      expect(source.config.settings).toEqual({
        paths: ['/events'],
        cors: false,
      });
    });

    it('exposes httpHandler on the source instance', async () => {
      const source = await sourceExpress(
        createSourceContext(
          {},
          {
            push: mockPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );
      expect(source.httpHandler).toBeDefined();
      expect(typeof source.httpHandler).toBe('function');
      // httpHandler should be the Express app itself
      expect(source.httpHandler).toBe(source.app);
    });

    it('should use env.express and env.cors when provided', async () => {
      const mockJsonMiddleware = jest.fn();
      const mockCorsMiddleware = jest.fn();

      const mockApp = {
        use: jest.fn(),
        post: jest.fn(),
        get: jest.fn(),
        options: jest.fn(),
      };

      const mockTextMiddleware = jest.fn();
      const mockExpress = Object.assign(jest.fn().mockReturnValue(mockApp), {
        json: jest.fn().mockReturnValue(mockJsonMiddleware),
        text: jest.fn().mockReturnValue(mockTextMiddleware),
      });

      const mockCors = jest.fn().mockReturnValue(mockCorsMiddleware);

      await sourceExpress(
        createSourceContext(
          {},
          {
            push: mockPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
            express: mockExpress as never,
            cors: mockCors as never,
          },
        ),
      );

      // Verify env.express was used to create app and middleware
      expect(mockExpress).toHaveBeenCalled();
      expect(mockExpress.json).toHaveBeenCalledWith({
        limit: '1mb',
        type: ['application/json', 'text/plain'],
      });
      expect(mockApp.use).toHaveBeenCalledWith(mockJsonMiddleware);

      // Verify env.cors was used for CORS middleware
      expect(mockCors).toHaveBeenCalled();
      expect(mockApp.use).toHaveBeenCalledWith(mockCorsMiddleware);
    });

    it('should start server when port is configured', async () => {
      const source = await sourceExpress(
        createSourceContext(
          {
            settings: { port: 0 }, // Port 0 = random available port
          },
          {
            push: mockPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      expect(source.server).toBeDefined();
      expect(source.server?.listening).toBe(true);

      // Cleanup
      await new Promise<void>((resolve) => {
        source.server?.close(() => resolve());
      });
    });
  });

  describe('POST request handling', () => {
    it('should push empty object for POST with missing body', async () => {
      const source = await sourceExpress(
        createSourceContext(
          {},
          {
            push: mockPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      const req = createMockRequest({
        method: 'POST',
        body: undefined,
      });
      const res = createMockResponse();

      await source.push(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockPush).toHaveBeenCalledWith({});
    });

    it('should push empty object for POST with invalid body type', async () => {
      const source = await sourceExpress(
        createSourceContext(
          {},
          {
            push: mockPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      const req = createMockRequest({
        method: 'POST',
        body: 'invalid',
      });
      const res = createMockResponse();

      await source.push(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockPush).toHaveBeenCalledWith({});
    });

    describe('raw body support', () => {
      it('parses JSON from text/plain POST (sendBeacon) via middleware', async () => {
        // Integration test: exercises the actual express middleware chain by
        // hitting a live server. Verifies the bug fix where navigator.sendBeacon
        // forces Content-Type to text/plain even with JSON payloads.
        const source = await sourceExpress(
          createSourceContext(
            { settings: { port: 0, paths: ['/collect'] } },
            {
              push: mockPush as never,
              command: mockCommand as never,
              elb: jest.fn() as never,
              logger: createMockLogger(),
            },
          ),
        );

        try {
          const address = source.server?.address();
          if (!address || typeof address === 'string') {
            throw new Error('Server did not bind');
          }
          const event = { name: 'page view', data: { title: 'beacon' } };

          const response = await fetch(
            `http://127.0.0.1:${address.port}/collect`,
            {
              method: 'POST',
              headers: { 'content-type': 'text/plain' },
              body: JSON.stringify(event),
            },
          );

          expect(response.status).toBe(200);
          expect(mockPush).toHaveBeenCalledWith(event);
        } finally {
          await new Promise<void>((resolve) => {
            source.server?.close(() => resolve());
          });
        }
      });

      it('should push empty event for undefined POST body', async () => {
        const source = await sourceExpress(
          createSourceContext(
            {},
            {
              push: mockPush as never,
              command: mockCommand as never,
              elb: jest.fn() as never,
              logger: createMockLogger(),
            },
          ),
        );

        const req = createMockRequest({
          method: 'POST',
          body: undefined,
        });
        const res = createMockResponse();

        await source.push(req, res);

        expect(mockPush).toHaveBeenCalledWith({});
        expect(res.statusCode).toBe(200);
      });

      it('should still push JSON body as-is (regression)', async () => {
        const source = await sourceExpress(
          createSourceContext(
            {},
            {
              push: mockPush as never,
              command: mockCommand as never,
              elb: jest.fn() as never,
              logger: createMockLogger(),
            },
          ),
        );

        const eventBody = { event: 'page view', data: { title: 'Home' } };
        const req = createMockRequest({
          method: 'POST',
          body: eventBody,
        });
        const res = createMockResponse();

        await source.push(req, res);

        expect(mockPush).toHaveBeenCalledWith(eventBody);
        expect(res.statusCode).toBe(200);
      });
    });

    it('should handle collector errors when async is disabled', async () => {
      const errorPush = jest
        .fn()
        .mockRejectedValue(new Error('Collector error'));

      const source = await sourceExpress(
        createSourceContext(
          { async: false },
          {
            push: errorPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      const req = createMockRequest({
        method: 'POST',
        body: { event: 'page view' },
      });
      const res = createMockResponse();

      await source.push(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.responseBody).toMatchObject({
        success: false,
        error: 'Collector error',
      });
    });
  });

  describe('GET request handling (pixel tracking)', () => {
    it('should return 1x1 GIF for pixel tracking', async () => {
      const source = await sourceExpress(
        createSourceContext(
          {},
          {
            push: mockPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      const req = createMockRequest({
        method: 'GET',
        url: '/collect.gif?event=page%20view',
      });
      const res = createMockResponse();

      await source.push(req, res);

      expect(res.responseHeaders?.['Content-Type']).toBe('image/gif');
      expect(Buffer.isBuffer(res.responseBody)).toBe(true);
    });
  });

  describe('OPTIONS request handling (CORS)', () => {
    it('should handle CORS preflight with default settings', async () => {
      const source = await sourceExpress(
        createSourceContext(
          {},
          {
            push: mockPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      const req = createMockRequest({
        method: 'OPTIONS',
        headers: { origin: 'https://example.com' },
      });
      const res = createMockResponse();

      await source.push(req, res);

      expect(res.statusCode).toBe(204);
      expect(res.responseHeaders?.['Access-Control-Allow-Origin']).toBe('*');
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should handle CORS preflight with custom settings', async () => {
      const source = await sourceExpress(
        createSourceContext(
          {
            settings: {
              cors: {
                origin: 'https://example.com',
                credentials: true,
              },
            },
          },
          {
            push: mockPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      const req = createMockRequest({
        method: 'OPTIONS',
        headers: { origin: 'https://example.com' },
      });
      const res = createMockResponse();

      await source.push(req, res);

      expect(res.statusCode).toBe(204);
      expect(res.responseHeaders?.['Access-Control-Allow-Origin']).toBe(
        'https://example.com',
      );
      expect(res.responseHeaders?.['Access-Control-Allow-Credentials']).toBe(
        'true',
      );
    });

    it('should not set CORS headers when disabled', async () => {
      const source = await sourceExpress(
        createSourceContext(
          {
            settings: { cors: false },
          },
          {
            push: mockPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      const req = createMockRequest({
        method: 'OPTIONS',
      });
      const res = createMockResponse();

      await source.push(req, res);

      expect(res.statusCode).toBe(204);
      expect(
        res.responseHeaders?.['Access-Control-Allow-Origin'],
      ).toBeUndefined();
    });
  });

  describe('unsupported methods', () => {
    it('should reject PUT requests', async () => {
      const source = await sourceExpress(
        createSourceContext(
          {},
          {
            push: mockPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      const req = createMockRequest({
        method: 'PUT',
        body: { event: 'page view' },
      });
      const res = createMockResponse();

      await source.push(req, res);

      expect(res.statusCode).toBe(405);
      expect(res.responseBody).toMatchObject({
        success: false,
        error: expect.stringContaining('Method not allowed'),
      });
    });
  });

  describe('settings validation', () => {
    it('should accept valid port number', async () => {
      const source = await sourceExpress(
        createSourceContext(
          {
            settings: { port: 8080 },
          },
          {
            push: mockPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      expect(source.config.settings?.port).toBe(8080);

      // Cleanup
      await new Promise<void>((resolve) => {
        source.server?.close(() => resolve());
      });
    });

    it('should apply default path', async () => {
      const source = await sourceExpress(
        createSourceContext(
          {},
          {
            push: mockPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      expect(source.config.settings?.paths).toEqual(['/collect']);
    });

    it('should accept custom path', async () => {
      const source = await sourceExpress(
        createSourceContext(
          {
            settings: { paths: ['/events'] },
          },
          {
            push: mockPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      expect(source.config.settings?.paths).toEqual(['/events']);
    });
  });

  describe('multi-path support', () => {
    it('should register multiple string paths', async () => {
      const source = await sourceExpress(
        createSourceContext(
          { settings: { paths: ['/collect', '/events'] } },
          {
            push: mockPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      // Both paths should work for POST
      for (const url of ['/collect', '/events']) {
        const req = createMockRequest({
          method: 'POST',
          url,
          body: { event: 'page view' },
        });
        const res = createMockResponse();
        await source.push(req, res);
        expect(res.responseBody).toMatchObject({ success: true });
      }
    });

    it('should respect per-route method restrictions', async () => {
      const source = await sourceExpress(
        createSourceContext(
          {
            settings: {
              paths: [
                { path: '/pixel', methods: ['GET'] },
                { path: '/ingest', methods: ['POST'] },
              ],
            },
          },
          {
            push: mockPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      expect(source.config.settings?.paths).toEqual([
        { path: '/pixel', methods: ['GET'] },
        { path: '/ingest', methods: ['POST'] },
      ]);
    });

    it('should default to ["/collect"] when no paths configured', async () => {
      const source = await sourceExpress(
        createSourceContext(
          {},
          {
            push: mockPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      expect(source.config.settings?.paths).toEqual(['/collect']);
    });

    it('should accept deprecated path setting', async () => {
      const source = await sourceExpress(
        createSourceContext(
          { settings: { path: '/events' } as never },
          {
            push: mockPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      expect(source.config.settings?.paths).toEqual(['/events']);
    });
  });

  describe('respond-first async ack', () => {
    // A push that returns a promise we can resolve/reject on demand, to prove
    // the HTTP response is produced without waiting for delivery to complete.
    function createDeferredPush(): {
      push: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      resolve: (value?: unknown) => void;
      reject: (reason?: unknown) => void;
    } {
      let resolve!: (value?: unknown) => void;
      let reject!: (reason?: unknown) => void;
      const pending = new Promise<unknown>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      const push = jest.fn(() => pending) as jest.MockedFunction<
        (...args: unknown[]) => Promise<unknown>
      >;
      return { push, resolve, reject };
    }

    it('GET returns the GIF even if push never resolves', async () => {
      const { push } = createDeferredPush();
      const source = await sourceExpress(
        createSourceContext(
          {},
          {
            push: push as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      const req = createMockRequest({
        method: 'GET',
        url: '/collect.gif?event=page%20view',
      });
      const res = createMockResponse();

      // Resolves immediately despite the never-resolving push.
      await source.push(req, res);

      expect(res.responseHeaders?.['Content-Type']).toBe('image/gif');
      expect(Buffer.isBuffer(res.responseBody)).toBe(true);
      expect(push).toHaveBeenCalled();
      // Push is still pending — we did not block on it.
    });

    it('GET logs a rejected push and does not throw out of the handler', async () => {
      const { push, reject } = createDeferredPush();
      const logger = createMockLogger();
      const source = await sourceExpress(
        createSourceContext(
          {},
          {
            push: push as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger,
          },
        ),
      );

      const req = createMockRequest({
        method: 'GET',
        url: '/collect.gif?event=page%20view',
      });
      const res = createMockResponse();

      await source.push(req, res);
      expect(res.responseHeaders?.['Content-Type']).toBe('image/gif');

      const error = new Error('delivery failed');
      reject(error);
      // Flush microtasks so the .catch handler runs.
      await Promise.resolve();
      await Promise.resolve();

      expect(logger.error).toHaveBeenCalledWith(error);
    });

    it('POST async (default) responds before push resolves', async () => {
      const { push, resolve } = createDeferredPush();
      const source = await sourceExpress(
        createSourceContext(
          {},
          {
            push: push as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      const req = createMockRequest({
        method: 'POST',
        body: { event: 'page view' },
      });
      const res = createMockResponse();

      await source.push(req, res);

      // Responded already, before the push promise settles.
      expect(res.statusCode).toBe(200);
      expect(res.responseBody).toMatchObject({ success: true });
      expect(push).toHaveBeenCalledWith({ event: 'page view' });

      resolve();
    });

    it('POST async (default) catches a rejected push without changing the 2xx response', async () => {
      const { push, reject } = createDeferredPush();
      const logger = createMockLogger();
      const source = await sourceExpress(
        createSourceContext(
          {},
          {
            push: push as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger,
          },
        ),
      );

      const req = createMockRequest({
        method: 'POST',
        body: { event: 'page view' },
      });
      const res = createMockResponse();

      await source.push(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.responseBody).toMatchObject({ success: true });

      const error = new Error('delivery failed');
      reject(error);
      await Promise.resolve();
      await Promise.resolve();

      // Rejection was caught/logged, not thrown, and response unchanged.
      expect(logger.error).toHaveBeenCalledWith(error);
      expect(res.statusCode).toBe(200);
      expect(res.responseBody).toMatchObject({ success: true });
    });

    it('POST async:false awaits push, then responds (regression)', async () => {
      const order: string[] = [];
      const slowPush = jest.fn(async () => {
        await Promise.resolve();
        order.push('push');
        return { ok: true };
      });
      const source = await sourceExpress(
        createSourceContext(
          { async: false },
          {
            push: slowPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      const res = createMockResponse();
      const sendSpy = res.send as jest.Mock;
      const jsonSpy = res.json as jest.Mock;
      jsonSpy.mockImplementation((body: unknown) => {
        order.push('respond');
        (res as { responseBody?: unknown }).responseBody = body;
        return res;
      });

      const req = createMockRequest({
        method: 'POST',
        body: { event: 'page view' },
      });

      await source.push(req, res);

      // Push completed before the response was sent.
      expect(order).toEqual(['push', 'respond']);
      expect(res.statusCode).toBe(200);
      expect(res.responseBody).toMatchObject({ success: true });
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('POST async responds while push is still pending (ordering proof)', async () => {
      const order: string[] = [];
      const { push, resolve } = createDeferredPush();
      // Record the relative moment the destination push settles.
      const settled = push().then(() => {
        order.push('push-settled');
      });

      const source = await sourceExpress(
        createSourceContext(
          {},
          {
            push: push as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      const res = createMockResponse();
      const jsonSpy = res.json as jest.Mock;
      jsonSpy.mockImplementation((body: unknown) => {
        order.push('respond');
        res.responseBody = body;
        return res;
      });

      const req = createMockRequest({
        method: 'POST',
        body: { event: 'page view' },
      });

      await source.push(req, res);

      // Response is committed even though the push has not settled yet.
      expect(order).toEqual(['respond']);
      expect(res.statusCode).toBe(200);
      expect(res.responseBody).toMatchObject({ success: true });

      // Now let delivery finish; it lands strictly after the response.
      resolve();
      await settled;
      expect(order).toEqual(['respond', 'push-settled']);
    });

    it('POST async rejected push never escapes as an unhandled rejection', async () => {
      const { push, reject } = createDeferredPush();
      const logger = createMockLogger();
      const source = await sourceExpress(
        createSourceContext(
          {},
          {
            push: push as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger,
          },
        ),
      );

      const unhandled: unknown[] = [];
      const onUnhandled = (reason: unknown): void => {
        unhandled.push(reason);
      };
      process.on('unhandledRejection', onUnhandled);

      try {
        const req = createMockRequest({
          method: 'POST',
          body: { event: 'page view' },
        });
        const res = createMockResponse();

        await source.push(req, res);
        expect(res.statusCode).toBe(200);
        expect(res.responseBody).toMatchObject({ success: true });

        const error = new Error('delivery failed');
        reject(error);

        // Flush microtasks AND a macrotask so Node would emit
        // 'unhandledRejection' for any promise the source failed to catch.
        await Promise.resolve();
        await Promise.resolve();
        await new Promise<void>((resolveTick) => setTimeout(resolveTick, 0));

        expect(logger.error).toHaveBeenCalledWith(error);
        expect(unhandled).toEqual([]);
      } finally {
        process.off('unhandledRejection', onUnhandled);
      }
    });
  });
});
