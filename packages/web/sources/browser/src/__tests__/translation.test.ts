/* eslint-disable jest/no-disabled-tests */
import { createCollector } from '@walkeros/collector';
import { createBrowserSource } from './test-utils';
import { translateToCoreCollector } from '../translation';
import type { WalkerOS, Collector } from '@walkeros/core';

describe.skip('Translation Layer (NEEDS UPDATE for run-only behavior)', () => {
  let collector: Collector.Instance;
  let collectedEvents: WalkerOS.Event[];
  let mockPush: jest.MockedFunction<Collector.Instance['push']>;

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

    // Create mock push function
    mockPush = jest.fn((...args: any[]) => {
      collectedEvents.push(args[0] as WalkerOS.Event);
      return Promise.resolve({
        ok: true,
        successful: [],
        queued: [],
        failed: [],
      });
    }) as unknown as jest.MockedFunction<Collector.Instance['push']>;

    // Initialize collector
    ({ collector } = await createCollector());

    // Override push with mock
    collector.push = mockPush;
  });

  describe('Source Information', () => {
    test('adds source information to string events', async () => {
      // Test direct translation call
      await translateToCoreCollector(
        collector,
        'test event',
        { id: 123 },
        undefined,
        { page: ['test', 0] },
      );

      expect(mockPush).toHaveBeenCalledWith(
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
        collector,
        123,
        { value: 'test' },
        undefined,
        { context: ['info', 0] },
      );

      expect(mockPush).toHaveBeenCalledWith(
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
        collector,
        'test event',
        'primitive string data',
        undefined,
        { page: ['test', 0] },
      );

      expect(mockPush).toHaveBeenCalledWith(
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
      await translateToCoreCollector(collector, 'walker config', {
        verbose: true,
      });

      // Walker commands should pass through without source info
      expect(mockPush).toHaveBeenCalledWith('walker config', { verbose: true });
    });

    test('does not add source information to object events', async () => {
      // Test object event - should pass through as-is
      const eventObject = {
        event: 'custom event',
        data: { test: true },
        source: { type: 'custom', id: 'custom-id', previous_id: '' },
      };

      await translateToCoreCollector(collector, eventObject);

      // Object events should pass through unchanged
      expect(mockPush).toHaveBeenCalledWith(eventObject);
    });

    test('handles empty referrer', async () => {
      // Mock empty referrer
      Object.defineProperty(document, 'referrer', {
        value: '',
        writable: true,
      });

      await translateToCoreCollector(collector, 'test event', { id: 123 });

      expect(mockPush).toHaveBeenCalledWith(
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

      await translateToCoreCollector(collector, 'navigation event', {
        page: 'test',
      });

      expect(mockPush).toHaveBeenCalledWith(
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

  describe('Event Processing with Source', () => {
    test('events from ELB layer include source information', async () => {
      // Setup ELB layer with events
      window.elbLayer = [
        ['product', { id: '123' }, 'click', { position: 1 }],
        ['page', { title: 'Test' }, 'load'],
      ];

      // Initialize source - should process existing commands
      await createBrowserSource(collector, { pageview: false });

      // Should have processed both events with source info
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'product',
          data: { id: '123' },
          context: { position: 1 },
          trigger: 'click',
          source: {
            type: 'browser',
            id: 'https://example.com/test-page',
            previous_id: 'https://previous.com/page',
          },
        }),
      );

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'page',
          data: { title: 'Test' },
          trigger: 'load',
          source: {
            type: 'browser',
            id: 'https://example.com/test-page',
            previous_id: 'https://previous.com/page',
          },
        }),
      );
    });

    test('DOM events include source information', async () => {
      // Setup DOM with trigger
      document.body.innerHTML = `
        <div data-elb="product" data-elb-product="id:123" data-elbaction="load:view">
          Product
        </div>
      `;

      // Initialize source - should trigger load events
      await createBrowserSource(collector, { pageview: false });

      // Should have processed the load trigger with source info
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'product view',
          entity: 'product',
          action: 'view',
          trigger: 'load',
          data: { id: 123 },
          source: {
            type: 'browser',
            id: 'https://example.com/test-page',
            previous_id: 'https://previous.com/page',
          },
        }),
      );
    });
  });

  describe('Context Normalization', () => {
    test('handles undefined context', async () => {
      await translateToCoreCollector(
        collector,
        'test event',
        { id: 123 },
        undefined,
        undefined, // undefined context
      );

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          context: {},
        }),
      );
    });

    test('handles element context', async () => {
      // Create a test element
      const element = document.createElement('div');
      element.id = 'test-element';
      element.className = 'test-class';

      await translateToCoreCollector(
        collector,
        'test event',
        { id: 123 },
        undefined,
        element, // element context
      );

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          context: {}, // Elements return empty object
        }),
      );
    });

    test('handles empty object context', async () => {
      await translateToCoreCollector(
        collector,
        'test event',
        { id: 123 },
        undefined,
        {}, // empty object context
      );

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          context: {}, // Empty objects return empty object
        }),
      );
    });

    test('handles valid ordered properties context', async () => {
      const validContext: WalkerOS.OrderedProperties = {
        page: ['home', 0],
        section: ['hero', 1],
      };

      await translateToCoreCollector(
        collector,
        'test event',
        { id: 123 },
        undefined,
        validContext,
      );

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          context: validContext, // Valid objects pass through
        }),
      );
    });
  });

  describe('Edge Cases', () => {
    test('handles null/undefined referrer gracefully', async () => {
      // Mock null referrer
      Object.defineProperty(document, 'referrer', {
        value: null,
        writable: true,
      });

      await translateToCoreCollector(collector, 'test event', { id: 123 });

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          source: {
            type: 'browser',
            id: 'https://example.com/test-page',
            previous_id: null,
          },
        }),
      );
    });

    test('handles malformed events with source', async () => {
      // Test with empty string event
      await translateToCoreCollector(collector, '', { test: true });

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          event: '',
          data: { test: true },
          source: {
            type: 'browser',
            id: 'https://example.com/test-page',
            previous_id: 'https://previous.com/page',
          },
        }),
      );
    });
  });

  afterEach(() => {
    // Clean up
    delete (window as any).elbLayer;
    document.body.innerHTML = '';
  });
});
