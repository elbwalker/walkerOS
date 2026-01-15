import { sourceExpress } from '../index';
import type { EventRequest, Types } from '../types';
import type { WalkerOS, Source, Collector } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import type { Request, Response } from 'express';

// Helper to create source context
function createSourceContext(
  config: Partial<Source.Config<Types>> = {},
  env: Partial<Types['env']> = {},
): Source.Context<Types> {
  return {
    config,
    env: env as Types['env'],
    logger: env.logger || createMockLogger(),
    id: 'test-express',
    collector: {} as Collector.Instance,
    setIngest: jest.fn().mockResolvedValue(undefined),
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
        path: '/collect',
        cors: true,
        status: true,
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
              path: '/events',
              cors: false,
              status: false,
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
        path: '/events',
        cors: false,
        status: false,
      });
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
    it('should process valid single event', async () => {
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

      const eventRequest: EventRequest = {
        event: 'page view',
        data: { title: 'Home' },
      };

      const req = createMockRequest({
        method: 'POST',
        body: eventRequest,
        headers: { 'content-type': 'application/json' },
      });
      const res = createMockResponse();

      await source.push(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.responseBody).toMatchObject({
        success: true,
        timestamp: expect.any(Number),
      });
      expect(mockPush).toHaveBeenCalledWith(eventRequest);
    });

    it('should reject POST with missing body', async () => {
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

      expect(res.statusCode).toBe(400);
      expect(res.responseBody).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid event'),
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should reject POST with invalid body type', async () => {
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

      expect(res.statusCode).toBe(400);
      expect(res.responseBody).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid event'),
      });
    });

    it('should handle collector errors', async () => {
      const errorPush = jest
        .fn()
        .mockRejectedValue(new Error('Collector error'));

      const source = await sourceExpress(
        createSourceContext(
          {},
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
    it('should process event from query parameters', async () => {
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
        url: '/collect?event=page%20view&data[title]=Home&user[id]=user123',
      });
      const res = createMockResponse();

      await source.push(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.responseHeaders?.['Content-Type']).toBe('image/gif');
      expect(res.responseHeaders?.['Cache-Control']).toContain('no-cache');
      expect(mockPush).toHaveBeenCalledWith({
        event: 'page view',
        data: { title: 'Home' },
        user: { id: 'user123' },
      });
    });

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

      expect(source.config.settings?.path).toBe('/collect');
    });

    it('should accept custom path', async () => {
      const source = await sourceExpress(
        createSourceContext(
          {
            settings: { path: '/events' },
          },
          {
            push: mockPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: createMockLogger(),
          },
        ),
      );

      expect(source.config.settings?.path).toBe('/events');
    });
  });
});
