import { startFlow } from '@walkeros/collector';
import { createBrowserSource } from './test-utils';
import { translateToCoreCollector } from '../translation';
import type { WalkerOS, Collector } from '@walkeros/core';
import type { Context, Settings } from '../types';
import { createRegistry } from '../trigger';

// Helper function to create test settings
const createTestSettings = (prefix = 'data-elb'): Settings => ({
  prefix,
  scope: document,
  pageview: false,
  capture: true,
  elb: false,
  elbLayer: false,
});

describe('Translation Layer', () => {
  let collector: Collector.Instance;
  let collectedEvents: WalkerOS.Event[];
  let mockPush: jest.MockedFunction<Collector.Instance['push']>;
  let mockElb: jest.MockedFunction<any>;

  beforeEach(async () => {
    collectedEvents = [];

    // Set URL path (jsdom base URL is https://example.com)
    window.history.replaceState({}, '', '/test-page');

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

    // Separate recorders per exit. The translation layer's job IS the routing
    // split (events -> push, `walker *` -> elb), so elb must not forward into
    // mockPush: that would make both exits indistinguishable here.
    mockElb = jest.fn().mockResolvedValue({ ok: true });

    // Initialize collector
    ({ collector } = await startFlow());

    // Override push with mock
    collector.push = mockPush;
  });

  // File-local context builder. The translation layer reads settings plus both
  // exits; the registry rides along because every Context carries one.
  const makeContext = (prefix = 'data-elb'): Context => ({
    elb: mockElb,
    push: mockPush,
    settings: createTestSettings(prefix),
    registry: createRegistry(),
  });

  describe('Source Information', () => {
    test('adds source information to string events', async () => {
      // Test direct translation call
      await translateToCoreCollector(
        makeContext(),
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
            platform: 'web',
            url: 'https://example.com/test-page',
            referrer: 'https://previous.com/page',
          },
        }),
      );
    });

    test('adds source information to flexible format events', async () => {
      // Test with number as event (falls through to flexible format)
      await translateToCoreCollector(
        makeContext(),
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
            platform: 'web',
            url: 'https://example.com/test-page',
            referrer: 'https://previous.com/page',
          },
        }),
      );
    });

    test('normalizes non-object data to empty object (legacy behavior)', async () => {
      // Test with primitive data - should become empty object
      await translateToCoreCollector(
        makeContext(),
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
            platform: 'web',
            url: 'https://example.com/test-page',
            referrer: 'https://previous.com/page',
          },
        }),
      );
    });

    test('passes walker commands to elb for routing', async () => {
      // Test that walker commands are passed to elb (which handles routing to collector.command)
      const isolatedMockElb = jest.fn().mockResolvedValue({
        ok: true,
      });
      const isolatedMockPush = jest.fn().mockResolvedValue({ ok: true });

      await translateToCoreCollector(
        {
          elb: isolatedMockElb,
          push: isolatedMockPush,
          settings: createTestSettings(),
          registry: createRegistry(),
        },
        'walker run',
        { consent: { marketing: true } },
      );

      // Verify browser source called elb correctly (routing responsibility)
      expect(isolatedMockElb).toHaveBeenCalledWith('walker run', {
        consent: { marketing: true },
      });
      // A command must never enter the source pipeline: `push` takes event
      // objects only.
      expect(isolatedMockPush).not.toHaveBeenCalled();

      // Verify it's a walker command (starts with 'walker ')
      const [command] = isolatedMockElb.mock.calls[0];
      expect(command).toMatch(/^walker /);
    });

    test('does not add source information to walker commands', async () => {
      // Test walker command
      await translateToCoreCollector(makeContext(), 'walker config', {
        prefix: 'data-elb',
      });

      // Walker commands leave via elb, unchanged and without source info.
      expect(mockElb).toHaveBeenCalledWith('walker config', {
        prefix: 'data-elb',
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    test('does not add source information to object events', async () => {
      // Test object event - should pass through as-is
      const eventObject = {
        name: 'custom event',
        data: { test: true },
        source: {
          type: 'custom',
          platform: 'web',
          url: 'custom-id',
          referrer: '',
        },
      };

      await translateToCoreCollector(makeContext(), eventObject);

      // Object events should pass through unchanged
      expect(mockPush).toHaveBeenCalledWith(eventObject);
    });

    test('handles empty referrer', async () => {
      // Mock empty referrer
      Object.defineProperty(document, 'referrer', {
        value: '',
        writable: true,
      });

      await translateToCoreCollector(makeContext(), 'test event', { id: 123 });

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          source: {
            type: 'browser',
            platform: 'web',
            url: 'https://example.com/test-page',
            referrer: '',
          },
        }),
      );
    });

    test('handles different URL formats', async () => {
      // Test with different URL path including query and hash
      window.history.replaceState({}, '', '/path?query=value#section');

      await translateToCoreCollector(makeContext(), 'navigation event', {
        page: 'test',
      });

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          source: {
            type: 'browser',
            platform: 'web',
            url: 'https://example.com/path?query=value#section',
            referrer: 'https://previous.com/page',
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

      // Initialize source - should process existing commands.
      // `runOnInit: true` drives on('run') so non-walker events drain.
      await createBrowserSource(
        collector,
        { pageview: false },
        {
          runOnInit: true,
        },
      );

      // Should have processed both events with source info
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'product',
          data: { id: '123' },
          context: { position: 1 },
          trigger: 'click',
          source: {
            type: 'browser',
            platform: 'web',
            url: 'https://example.com/test-page',
            referrer: 'https://previous.com/page',
          },
        }),
      );

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'page',
          data: { id: '/test-page', title: 'Test' },
          trigger: 'load',
          source: {
            type: 'browser',
            platform: 'web',
            url: 'https://example.com/test-page',
            referrer: 'https://previous.com/page',
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
            platform: 'web',
            url: 'https://example.com/test-page',
            referrer: 'https://previous.com/page',
          },
        }),
      );
    });
  });

  describe('Context Normalization', () => {
    const element = () => {
      const el = document.createElement('div');
      el.id = 'test-element';
      el.className = 'test-class';
      return el;
    };
    const ordered: WalkerOS.OrderedProperties = {
      page: ['home', 0],
      section: ['hero', 1],
    };

    it.each([
      ['undefined', () => undefined, {}],
      ['an element', element, {}],
      ['an empty object', () => ({}), {}],
      ['valid ordered properties', () => ordered, ordered],
    ])('normalizes %s context', async (_label, build, expected) => {
      await translateToCoreCollector(
        makeContext(),
        'test event',
        { id: 123 },
        undefined,
        build(),
      );

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({ context: expected }),
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

      await translateToCoreCollector(makeContext(), 'test event', { id: 123 });

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          source: {
            type: 'browser',
            platform: 'web',
            url: 'https://example.com/test-page',
            referrer: null,
          },
        }),
      );
    });

    test('handles malformed events with source', async () => {
      // Test with empty string event
      await translateToCoreCollector(makeContext(), '', { test: true });

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '',
          data: { test: true },
          source: {
            type: 'browser',
            platform: 'web',
            url: 'https://example.com/test-page',
            referrer: 'https://previous.com/page',
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
