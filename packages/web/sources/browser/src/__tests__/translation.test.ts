import { translateToCoreCollector } from '../translation';
import type { WalkerOS, Elb } from '@walkeros/core';
import type { Settings, Context } from '../types';

// Helper function to create test settings
const createTestSettings = (prefix = 'data-elb'): Settings => ({
  prefix,
  scope: document,
  pageview: false,
  session: false,
  elb: '',
  elbLayer: false,
});

// Helper function to create test context
const createTestContext = (prefix = 'data-elb'): Context => ({
  elb: jest.fn() as jest.MockedFunction<Elb.Fn>,
  settings: createTestSettings(prefix),
});

describe('Translation Layer', () => {
  let mockContext: Context;
  let collectedEvents: WalkerOS.Event[];

  beforeEach(async () => {
    collectedEvents = [];

    // Mock window.location and document.referrer
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://example.com/test-page',
      },
      writable: true,
    });

    Object.defineProperty(document, 'referrer', {
      value: 'https://previous.com/page',
      writable: true,
    });

    // Create mock context with elb that captures events
    mockContext = createTestContext();
    (mockContext.elb as jest.MockedFunction<Elb.Fn>).mockImplementation(
      (...args: unknown[]) => {
        collectedEvents.push(args[0] as WalkerOS.Event);
        return Promise.resolve({
          ok: true,
          successful: [],
          queued: [],
          failed: [],
        });
      },
    );
  });

  describe('Source Information', () => {
    test('adds source information to string events', async () => {
      // Test direct translation call
      await translateToCoreCollector(
        mockContext,
        'test event',
        { id: 123 },
        undefined,
        { page: ['test', 0] },
      );

      expect(mockContext.elb).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'test event',
          data: { id: 123 },
          context: { page: ['test', 0] },
          source: {
            type: 'browser',
            id: 'https://example.com/test-page',
            previous_id: 'https://previous.com/page',
          },
        }),
      );
    });

    test('adds source information to flexible format events', async () => {
      // Test with number as event (falls through to flexible format)
      await translateToCoreCollector(
        mockContext,
        123,
        { value: 'test' },
        undefined,
        { context: ['info', 0] },
      );

      expect(mockContext.elb).toHaveBeenCalledWith(
        expect.objectContaining({
          event: '123',
          data: { value: 'test' },
          context: { context: ['info', 0] },
          source: {
            type: 'browser',
            id: 'https://example.com/test-page',
            previous_id: 'https://previous.com/page',
          },
        }),
      );
    });

    test('normalizes non-object data to empty object (legacy behavior)', async () => {
      // Test with primitive data - should become empty object
      await translateToCoreCollector(
        mockContext,
        'test event',
        'primitive string data',
        undefined,
        { page: ['test', 0] },
      );

      expect(mockContext.elb).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'test event',
          data: {}, // Should be empty object, not { value: 'primitive string data' }
          context: { page: ['test', 0] },
          source: {
            type: 'browser',
            id: 'https://example.com/test-page',
            previous_id: 'https://previous.com/page',
          },
        }),
      );
    });

    test('does not add source information to walker commands', async () => {
      // Test walker command
      await translateToCoreCollector(mockContext, 'walker config', {
        verbose: true,
      });

      // Walker commands should pass through without source info
      expect(mockContext.elb).toHaveBeenCalledWith('walker config', {
        verbose: true,
      });
    });

    test('does not add source information to object events', async () => {
      // Test object event - should pass through as-is
      const eventObject = {
        event: 'custom event',
        data: { test: true },
        source: { type: 'custom', id: 'custom-id', previous_id: '' },
      };

      await translateToCoreCollector(mockContext, eventObject);

      // Object events should pass through unchanged
      expect(mockContext.elb).toHaveBeenCalledWith(eventObject);
    });

    test('handles empty referrer', async () => {
      // Mock empty referrer
      Object.defineProperty(document, 'referrer', {
        value: '',
        writable: true,
      });

      await translateToCoreCollector(mockContext, 'test event', { id: 123 });

      expect(mockContext.elb).toHaveBeenCalledWith(
        expect.objectContaining({
          source: {
            type: 'browser',
            id: 'https://example.com/test-page',
            previous_id: '',
          },
        }),
      );
    });

    test('handles different URL formats', async () => {
      // Test with different URL
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://test.com/path?query=value#section',
        },
        writable: true,
      });

      await translateToCoreCollector(mockContext, 'test event', { id: 123 });

      expect(mockContext.elb).toHaveBeenCalledWith(
        expect.objectContaining({
          source: {
            type: 'browser',
            id: 'https://test.com/path?query=value#section',
            previous_id: 'https://previous.com/page',
          },
        }),
      );
    });
  });

  describe('Event Processing', () => {
    test('processes events with all optional parameters', async () => {
      await translateToCoreCollector(
        mockContext,
        'complete event',
        { id: 456, name: 'test' },
        { trigger: 'click' },
        { page: ['home', 1], user: ['logged-in', 2] },
        [{ type: 'product', data: { sku: 'ABC123' }, nested: [], context: {} }],
        { custom: 'data' },
      );

      expect(mockContext.elb).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'complete event',
          data: { id: 456, name: 'test' },
          context: { page: ['home', 1], user: ['logged-in', 2] },
          nested: [
            {
              type: 'product',
              data: { sku: 'ABC123' },
              nested: [],
              context: {},
            },
          ],
          custom: { custom: 'data' },
          source: {
            type: 'browser',
            id: 'https://example.com/test-page',
            previous_id: 'https://previous.com/page',
          },
        }),
      );
    });

    test('handles minimal event parameters', async () => {
      await translateToCoreCollector(mockContext, 'minimal event');

      expect(mockContext.elb).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'minimal event',
          data: {},
          source: {
            type: 'browser',
            id: 'https://example.com/test-page',
            previous_id: 'https://previous.com/page',
          },
        }),
      );
    });

    test('passes through object events unchanged', async () => {
      const fullEvent = {
        event: 'pre-built event',
        data: { pre: 'built' },
        context: { existing: ['context', 1] },
        source: { type: 'custom', id: 'custom-source', previous_id: '' },
        timestamp: 1234567890,
        id: 'custom-event-id',
      };

      await translateToCoreCollector(mockContext, fullEvent);

      expect(mockContext.elb).toHaveBeenCalledWith(fullEvent);
    });
  });

  describe('Edge Cases', () => {
    test('handles undefined/null data gracefully', async () => {
      await translateToCoreCollector(mockContext, 'null data event', undefined);

      expect(mockContext.elb).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'null data event',
          data: {},
          source: expect.any(Object),
        }),
      );
    });

    test('handles complex nested data', async () => {
      const complexData = {
        level1: {
          level2: {
            array: [1, 2, { nested: true }],
            string: 'test',
          },
        },
        topLevel: 'value',
      };

      await translateToCoreCollector(mockContext, 'complex event', complexData);

      expect(mockContext.elb).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'complex event',
          data: complexData,
          source: expect.any(Object),
        }),
      );
    });
  });
});
