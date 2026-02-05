import { sourceMySource } from '.';
import type { Source, Collector } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import type { Settings } from './types';
import { inputs, outputs } from '../../examples';

/**
 * Test template for server sources.
 *
 * Key patterns:
 * 1. Use createSourceContext() helper - standardizes context creation
 * 2. Mock env.push - verify events are forwarded to collector
 * 3. Use examples for test data - don't hardcode test values
 * 4. Test error paths - verify graceful error handling and logging
 */

// Helper to create source context for testing
function createSourceContext(
  config: Partial<Source.Config<{ settings: Settings }>> = {},
  env: Partial<Source.Env> = {},
): Source.Context<{ settings: Settings; env: Source.Env }> {
  return {
    config,
    env: env as Source.Env,
    logger: env.logger || createMockLogger(),
    id: 'test-my-source',
    collector: {} as Collector.Instance,
  };
}

// Helper to create mock request
function createMockRequest(body: unknown): Request {
  return new Request('https://example.com/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('sourceMySource', () => {
  let mockPush: jest.MockedFunction<(...args: unknown[]) => unknown>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockPush = jest.fn().mockResolvedValue({
      event: { id: 'test-id' },
      ok: true,
    });
    mockLogger = createMockLogger();
  });

  describe('initialization', () => {
    it('should initialize with default settings', async () => {
      const source = await sourceMySource(
        createSourceContext(
          {},
          {
            push: mockPush as never,
            command: jest.fn() as never,
            elb: jest.fn() as never,
            logger: mockLogger,
          },
        ),
      );

      expect(source.type).toBe('my-source');
      expect(typeof source.push).toBe('function');
    });

    it('should merge custom settings with defaults', async () => {
      const source = await sourceMySource(
        createSourceContext(
          { settings: { validateSignature: true } },
          {
            push: mockPush as never,
            command: jest.fn() as never,
            elb: jest.fn() as never,
            logger: mockLogger,
          },
        ),
      );

      expect(source.config.settings?.validateSignature).toBe(true);
    });
  });

  describe('event processing', () => {
    it('should process valid input and call env.push', async () => {
      const source = await sourceMySource(
        createSourceContext(
          {},
          {
            push: mockPush as never,
            command: jest.fn() as never,
            elb: jest.fn() as never,
            logger: mockLogger,
          },
        ),
      );

      // Use examples for test input
      const request = createMockRequest(inputs.pageViewInput);
      const response = await source.push(request);

      expect(response.status).toBe(200);
      expect(mockPush).toHaveBeenCalled();
    });

    it('should reject invalid input', async () => {
      const source = await sourceMySource(
        createSourceContext(
          {},
          {
            push: mockPush as never,
            command: jest.fn() as never,
            elb: jest.fn() as never,
            logger: mockLogger,
          },
        ),
      );

      const request = createMockRequest(inputs.invalidInput);
      const response = await source.push(request);

      expect(response.status).toBe(400);
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const errorPush = jest.fn().mockRejectedValue(new Error('Failed'));
      const source = await sourceMySource(
        createSourceContext(
          {},
          {
            push: errorPush as never,
            command: jest.fn() as never,
            elb: jest.fn() as never,
            logger: mockLogger,
          },
        ),
      );

      const request = createMockRequest(inputs.pageViewInput);
      const response = await source.push(request);

      expect(response.status).toBe(500);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
