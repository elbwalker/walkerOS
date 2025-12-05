import { sourceFetch } from '../index';
import type { WalkerOS } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { examples } from '../dev';

describe('sourceFetch', () => {
  let mockPush: jest.MockedFunction<(...args: unknown[]) => unknown>;
  let mockCommand: jest.MockedFunction<(...args: unknown[]) => unknown>;

  beforeEach(() => {
    mockPush = jest.fn().mockResolvedValue({
      event: { id: 'test-id' },
      ok: true,
      successful: [],
      queued: [],
      failed: [],
    });
    mockCommand = jest.fn().mockResolvedValue({
      ok: true,
      successful: [],
      queued: [],
      failed: [],
    });
  });

  describe('initialization', () => {
    it('should initialize with default settings', async () => {
      const source = await sourceFetch(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: createMockLogger(),
        },
      );

      expect(source.type).toBe('fetch');
      expect(source.config.settings).toEqual({
        path: '/collect',
        cors: true,
        healthPath: '/health',
      });
      expect(typeof source.push).toBe('function');
    });

    it('should merge custom settings with defaults', async () => {
      const source = await sourceFetch(
        {
          settings: {
            path: '/events',
            cors: false,
            healthPath: '/status',
          },
        },
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: createMockLogger(),
        },
      );

      expect(source.config.settings).toEqual({
        path: '/events',
        cors: false,
        healthPath: '/status',
      });
    });
  });

  describe('POST request handling', () => {
    it('should process valid single event', async () => {
      const source = await sourceFetch(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: createMockLogger(),
        },
      );

      const event: WalkerOS.DeepPartialEvent = {
        name: 'page view',
        data: { title: 'Home' },
      };

      const request = new Request('https://example.com/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });

      const response = await source.push(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody).toMatchObject({
        success: true,
        timestamp: expect.any(Number),
      });
      expect(mockPush).toHaveBeenCalledWith(event);
    });

    it('should reject POST with invalid JSON body', async () => {
      const source = await sourceFetch(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: createMockLogger(),
        },
      );

      const request = new Request('https://example.com/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await source.push(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid JSON'),
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should reject POST with non-object body', async () => {
      const source = await sourceFetch(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: createMockLogger(),
        },
      );

      const request = new Request('https://example.com/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify('invalid'),
      });

      const response = await source.push(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid event'),
      });
    });

    it('should process complete event with all properties', async () => {
      const source = await sourceFetch(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: createMockLogger(),
        },
      );

      const completeEvent: WalkerOS.DeepPartialEvent = {
        name: 'product add',
        data: { id: 'P123', name: 'Laptop', price: 999 },
        context: { stage: ['shopping', 1] },
        globals: { language: 'en', currency: 'USD' },
        custom: { campaignId: 'summer-sale' },
        user: { id: 'user123', email: 'user@example.com' },
        nested: [{ entity: 'category', data: { name: 'Electronics' } }],
        consent: { functional: true, marketing: true },
        trigger: 'click',
        group: 'ecommerce',
      };

      const request = new Request('https://example.com/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completeEvent),
      });

      const response = await source.push(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody).toMatchObject({
        success: true,
        timestamp: expect.any(Number),
      });
      expect(mockPush).toHaveBeenCalledWith(completeEvent);
    });

    it('should handle collector errors', async () => {
      const errorPush = jest
        .fn()
        .mockRejectedValue(new Error('Collector error'));

      const source = await sourceFetch(
        {},
        {
          push: errorPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: createMockLogger(),
        },
      );

      const request = new Request('https://example.com/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'page view' }),
      });

      const response = await source.push(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody).toMatchObject({
        success: false,
        error: 'Collector error',
      });
    });
  });

  describe('GET request handling (pixel tracking)', () => {
    it('should process event from query parameters', async () => {
      const source = await sourceFetch(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: createMockLogger(),
        },
      );

      const request = new Request(
        'https://example.com/collect?event=page%20view&data[title]=Home&user[id]=user123',
        { method: 'GET' },
      );

      const response = await source.push(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/gif');
      expect(response.headers.get('Cache-Control')).toContain('no-cache');
      expect(mockPush).toHaveBeenCalledWith({
        event: 'page view',
        data: { title: 'Home' },
        user: { id: 'user123' },
      });
    });

    it('should return 1x1 GIF for pixel tracking', async () => {
      const source = await sourceFetch(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: createMockLogger(),
        },
      );

      const request = new Request(
        'https://example.com/collect.gif?event=page%20view',
        { method: 'GET' },
      );

      const response = await source.push(request);
      const buffer = await response.arrayBuffer();

      expect(response.headers.get('Content-Type')).toBe('image/gif');
      expect(buffer.byteLength).toBeGreaterThan(0);
    });
  });

  describe('OPTIONS request handling (CORS)', () => {
    it('should handle CORS preflight with default settings', async () => {
      const source = await sourceFetch(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: createMockLogger(),
        },
      );

      const request = new Request('https://example.com/collect', {
        method: 'OPTIONS',
        headers: { Origin: 'https://example.com' },
      });

      const response = await source.push(request);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should handle CORS preflight with custom settings', async () => {
      const source = await sourceFetch(
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
      );

      const request = new Request('https://example.com/collect', {
        method: 'OPTIONS',
        headers: { Origin: 'https://example.com' },
      });

      const response = await source.push(request);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://example.com',
      );
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe(
        'true',
      );
    });

    it('should not set CORS headers when disabled', async () => {
      const source = await sourceFetch(
        {
          settings: { cors: false },
        },
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: createMockLogger(),
        },
      );

      const request = new Request('https://example.com/collect', {
        method: 'OPTIONS',
      });

      const response = await source.push(request);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
  });

  describe('health check', () => {
    it('should respond to health check endpoint', async () => {
      const source = await sourceFetch(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: createMockLogger(),
        },
      );

      const request = new Request('https://example.com/health', {
        method: 'GET',
      });

      const response = await source.push(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody).toMatchObject({
        status: 'ok',
        source: 'fetch',
        timestamp: expect.any(Number),
      });
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('unsupported methods', () => {
    it('should reject PUT requests', async () => {
      const source = await sourceFetch(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: createMockLogger(),
        },
      );

      const request = new Request('https://example.com/collect', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'page view' }),
      });

      const response = await source.push(request);
      const responseBody = await response.json();

      expect(response.status).toBe(405);
      expect(responseBody).toMatchObject({
        success: false,
        error: expect.stringContaining('Method not allowed'),
      });
    });
  });

  describe('settings validation', () => {
    it('should apply default path', async () => {
      const source = await sourceFetch(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: createMockLogger(),
        },
      );

      expect(source.config.settings?.path).toBe('/collect');
    });

    it('should accept custom path', async () => {
      const source = await sourceFetch(
        {
          settings: { path: '/events' },
        },
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: createMockLogger(),
        },
      );

      expect(source.config.settings?.path).toBe('/events');
    });
  });

  describe('example-driven tests', () => {
    it('should process examples.inputs.pageView', async () => {
      const mockPush = jest
        .fn()
        .mockResolvedValue({ event: { id: 'test-id' } });

      const source = await sourceFetch(
        {},
        {
          push: mockPush as never,
          command: jest.fn() as never,
          elb: jest.fn() as never,
          logger: createMockLogger(),
        },
      );

      const request = new Request('https://example.com/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examples.inputs.pageView),
      });

      await source.push(request);

      expect(mockPush).toHaveBeenCalledWith(examples.inputs.pageView);
    });
  });
});
