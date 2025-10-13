import { sourceCloudFunction } from '../index';
import type { EventRequest, Request, Response, Types } from '../types';
import type { WalkerOS, Source } from '@walkeros/core';

// Mock request/response for testing
function createMockRequest(
  method = 'POST',
  body?: unknown,
  headers: Record<string, string> = {},
): Request {
  return {
    method,
    body,
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

describe('sourceCloudFunction', () => {
  let mockElb: jest.MockedFunction<(...args: unknown[]) => unknown>;

  beforeEach(() => {
    mockElb = jest.fn().mockResolvedValue({
      event: { id: 'test-id' },
      ok: true,
      successful: [],
      queued: [],
      failed: [],
    });
  });

  describe('initialization', () => {
    it('should initialize with default settings', async () => {
      const source = await sourceCloudFunction({}, { elb: mockElb as never });

      expect(source.type).toBe('cloudfunction');
      expect(source.config.settings).toEqual({
        cors: true,
        timeout: 30000,
      });
      expect(typeof source.push).toBe('function');
    });

    it('should merge custom settings with defaults', async () => {
      const config: Partial<Source.Config<Types>> = {
        settings: {
          cors: false,
        },
      };

      const source = await sourceCloudFunction(config, {
        elb: mockElb as never,
      });

      expect(source.config.settings).toEqual({
        cors: false,
        timeout: 30000,
      });
    });

    it('should throw error when elb is not provided', async () => {
      await expect(
        sourceCloudFunction({}, { elb: undefined as never }),
      ).rejects.toThrow(
        'Cloud Function source requires elb function in environment',
      );
    });
  });

  describe('handler functionality', () => {
    it('should handle OPTIONS requests for CORS', async () => {
      const source = await sourceCloudFunction({}, { elb: mockElb as never });
      const req = createMockRequest('OPTIONS');
      const res = createMockResponse();

      await source.push(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
      expect(mockElb).not.toHaveBeenCalled();
    });

    it('should reject non-POST methods', async () => {
      const source = await sourceCloudFunction({}, { elb: mockElb as never });
      const req = createMockRequest('GET');
      const res = createMockResponse();

      await source.push(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Method not allowed. Use POST.',
      });
    });

    it('should require request body', async () => {
      const source = await sourceCloudFunction({}, { elb: mockElb as never });
      const req = createMockRequest('POST', undefined);
      const res = createMockResponse();

      await source.push(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Request body is required',
      });
    });
  });

  describe('single event processing', () => {
    it('should process valid single event', async () => {
      const source = await sourceCloudFunction({}, { elb: mockElb as never });
      const eventRequest: EventRequest = {
        event: 'page view',
        data: { title: 'Test Page' },
      };

      const req = createMockRequest('POST', eventRequest);
      const res = createMockResponse();

      await source.push(req, res);

      expect(mockElb).toHaveBeenCalledWith('page view', { title: 'Test Page' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        id: 'test-id',
      });
    });

    it('should handle event processing errors', async () => {
      const errorElb = jest
        .fn()
        .mockRejectedValue(new Error('Processing failed'));
      const source = await sourceCloudFunction({}, { elb: errorElb });
      const eventRequest: EventRequest = {
        event: 'error event',
        data: { test: true },
      };

      const req = createMockRequest('POST', eventRequest);
      const res = createMockResponse();

      await source.push(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Processing failed',
      });
    });
  });

  describe('CORS handling', () => {
    it('should set default CORS headers when enabled', async () => {
      const source = await sourceCloudFunction(
        { settings: { cors: true } },
        { elb: mockElb as never },
      );

      const req = createMockRequest('OPTIONS');
      const res = createMockResponse();

      await source.push(req, res);

      expect(res.set).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(res.set).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'POST, OPTIONS',
      );
      expect(res.set).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization',
      );
    });

    it('should set custom CORS headers', async () => {
      const source = await sourceCloudFunction(
        {
          settings: {
            cors: {
              origin: ['https://example.com'],
              methods: ['POST'],
              headers: ['Content-Type'],
              credentials: true,
              maxAge: 7200,
            },
          },
        },
        { elb: mockElb as never },
      );

      const req = createMockRequest('OPTIONS');
      const res = createMockResponse();

      await source.push(req, res);

      expect(res.set).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://example.com',
      );
      expect(res.set).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'POST',
      );
      expect(res.set).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Content-Type',
      );
      expect(res.set).toHaveBeenCalledWith(
        'Access-Control-Allow-Credentials',
        'true',
      );
      expect(res.set).toHaveBeenCalledWith('Access-Control-Max-Age', '7200');
    });

    it('should not set CORS headers when disabled', async () => {
      const source = await sourceCloudFunction(
        { settings: { cors: false } },
        { elb: mockElb as never },
      );

      const req = createMockRequest('OPTIONS');
      const res = createMockResponse();

      await source.push(req, res);

      expect(res.set).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle invalid request format', async () => {
      const source = await sourceCloudFunction({}, { elb: mockElb as never });
      const req = createMockRequest('POST', { invalid: 'format' });
      const res = createMockResponse();

      await source.push(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid request format. Expected event object.',
      });
    });
  });

  describe('destroy', () => {
    it('should complete destroy without errors', async () => {
      const source = await sourceCloudFunction({}, { elb: mockElb as never });

      // Cloud Functions are stateless, so destroy should complete without action
      expect(source.destroy).toBeUndefined();
    });
  });
});
