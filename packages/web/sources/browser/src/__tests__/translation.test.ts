import { startFlow } from '@walkeros/collector';
import { createBrowserSource } from './test-utils';
import { translateToCoreCollector } from '../translation';
import type { WalkerOS, Collector } from '@walkeros/core';
import type { Settings } from '../types';

// Helper function to create test settings
const createTestSettings = (prefix = 'data-elb'): Settings => ({
  prefix,
  scope: document,
  pageview: false,
  session: false,
  elb: '',
  elbLayer: false,
});

describe('Translation Layer', () => {
  let collector: Collector.Instance;
  let collectedEvents: WalkerOS.Event[];
  let mockPush: jest.MockedFunction<Collector.Instance['push']>;
  let mockElb: jest.MockedFunction<any>;

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
      });
    }) as unknown as jest.MockedFunction<Collector.Instance['push']>;

    // Create simple mock elb that just passes through to mockPush
    mockElb = jest.fn((arg1, arg2) =>
      arg2 !== undefined ? mockPush(arg1, arg2) : mockPush(arg1),
    );

    // Initialize collector
    ({ collector } = await startFlow());

    // Override push with mock
    collector.push = mockPush;
  });

  describe('Source Information', () => {
    test('adds source information to string events', async () => {
      // Test direct translation call
      await translateToCoreCollector(
        { elb: mockElb, settings: createTestSettings() },
        'test event',
        { id: 123 },
        undefined,
        { page: ['test', 0] },
      );

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test event',
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
        { elb: mockElb, settings: createTestSettings() },
        123,
        { value: 'test' },
        undefined,
        { context: ['info', 0] },
      );

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '123',
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
        { elb: mockElb, settings: createTestSettings() },
        'test event',
        'primitive string data',
        undefined,
        { page: ['test', 0] },
      );

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test event',
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

    test('passes walker commands to elb for routing', async () => {
      // Test that walker commands are passed to elb (which handles routing to collector.command)
      const isolatedMockElb = jest.fn().mockResolvedValue({
        ok: true,
      });

      await translateToCoreCollector(
        { elb: isolatedMockElb, settings: createTestSettings() },
        'walker run',
        { consent: { marketing: true } },
      );

      // Verify browser source called elb correctly (routing responsibility)
      expect(isolatedMockElb).toHaveBeenCalledWith('walker run', {
        consent: { marketing: true },
      });

      // Verify it's a walker command (starts with 'walker ')
      const [command] = isolatedMockElb.mock.calls[0];
      expect(command).toMatch(/^walker /);
    });

    test('does not add source information to walker commands', async () => {
      // Test walker command
      await translateToCoreCollector(
        { elb: mockElb, settings: createTestSettings() },
        'walker config',
        {
          tagging: 2,
        },
      );

      // Walker commands should pass through without source info
      expect(mockPush).toHaveBeenCalledWith('walker config', { tagging: 2 });
    });

    test('does not add source information to object events', async () => {
      // Test object event - should pass through as-is
      const eventObject = {
        name: 'custom event',
        data: { test: true },
        source: { type: 'custom', id: 'custom-id', previous_id: '' },
      };

      await translateToCoreCollector(
        { elb: mockElb, settings: createTestSettings() },
        eventObject,
      );

      // Object events should pass through unchanged
      expect(mockPush).toHaveBeenCalledWith(eventObject);
    });

    test('handles empty referrer', async () => {
      // Mock empty referrer
      Object.defineProperty(document, 'referrer', {
        value: '',
        writable: true,
      });

      await translateToCoreCollector(
        { elb: mockElb, settings: createTestSettings() },
        'test event',
        { id: 123 },
      );

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

      await translateToCoreCollector(
        { elb: mockElb, settings: createTestSettings() },
        'navigation event',
        {
          page: 'test',
        },
      );

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
          name: 'product',
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
          name: 'page',
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
      const { elb } = await createBrowserSource(collector, { pageview: false });

      // Clear mock to test manual event triggering
      mockPush.mockClear();

      // Test by directly calling the event with source information
      if (elb) {
        await elb('product view', { id: 123 }, 'load');
      }

      // Should have processed the event with source info
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'product view',
          data: { id: 123 },
          trigger: 'load',
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
        { elb: mockElb, settings: createTestSettings() },
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
        { elb: mockElb, settings: createTestSettings() },
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
        { elb: mockElb, settings: createTestSettings() },
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
        { elb: mockElb, settings: createTestSettings() },
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

      await translateToCoreCollector(
        { elb: mockElb, settings: createTestSettings() },
        'test event',
        { id: 123 },
      );

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
      await translateToCoreCollector(
        { elb: mockElb, settings: createTestSettings() },
        '',
        { test: true },
      );

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '',
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
    (window as unknown as { elbLayer?: unknown[] }).elbLayer = undefined;
    document.body.innerHTML = '';
  });
});
