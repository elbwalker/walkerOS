/* eslint-disable jest/no-disabled-tests */
import { createCollector } from '@walkeros/collector';
import { createBrowserSource } from './test-utils';
import { initElbLayer } from '../elbLayer';
import type { WalkerOS, Collector, On } from '@walkeros/core';

describe.skip('ELB Layer (NEEDS UPDATE for run-only behavior)', () => {
  let collectedEvents: WalkerOS.Event[];
  let collector: Collector.Instance;
  let mockPush: jest.MockedFunction<Collector.Instance['push']>;

  beforeEach(async () => {
    // Clear any existing elbLayer
    delete (window as any).elbLayer;
    collectedEvents = [];

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

  afterEach(() => {
    // Clean up window properties
    delete (window as any).elbLayer;
    delete (window as any).customLayer;
  });

  describe('ELB Layer Initialization', () => {
    test('creates elbLayer array on window', () => {
      expect(window.elbLayer).toBeUndefined();

      initElbLayer(collector);

      expect(window.elbLayer).toBeDefined();
      expect(Array.isArray(window.elbLayer)).toBe(true);
      expect(window.elbLayer).toHaveLength(0);
    });

    test('uses custom layer name', () => {
      expect((window as any).customLayer).toBeUndefined();

      initElbLayer(collector, { name: 'customLayer' });

      expect((window as any).customLayer).toBeDefined();
      expect(Array.isArray((window as any).customLayer)).toBe(true);
      expect(window.elbLayer).toBeUndefined();
    });

    test('preserves existing elbLayer if present', () => {
      window.elbLayer = [['existing', 'commands'] as unknown[]];

      initElbLayer(collector);

      expect(window.elbLayer).toBeDefined();
      expect(Array.isArray(window.elbLayer)).toBe(true);
      // Commands should be processed and cleared
      expect(window.elbLayer).toHaveLength(0);
    });
  });

  describe('Command Processing', () => {
    test('processes existing commands on initialization', () => {
      // Pre-populate elbLayer with commands
      window.elbLayer = [
        ['page', 'view', 'load'],
        ['product', 'click', 'click', { id: 'test' }],
      ];

      initElbLayer(collector);

      expect(mockPush).toHaveBeenCalledTimes(2);
      expect(window.elbLayer).toHaveLength(0); // Commands cleared after processing
    });

    test('processes walker commands with priority', () => {
      window.elbLayer = [
        ['product', 'click', 'click'], // Regular event
        ['walker run', { consent: { marketing: true } }], // Walker command
        ['page', 'view', 'load'], // Regular event
        ['walker user', { id: 'user123' }], // Walker command
      ];

      initElbLayer(collector);

      expect(mockPush).toHaveBeenCalledTimes(3);

      // Walker commands should be processed first (first walker run is skipped)
      expect(mockPush).toHaveBeenNthCalledWith(1, 'walker user', {
        id: 'user123',
      });

      // Then regular events
      expect(mockPush).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ event: 'product' }),
      );
      expect(mockPush).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ event: 'page' }),
      );
    });

    test('handles array-like commands', () => {
      window.elbLayer = [
        ['test_event', { key: 'value' }, 'load', { context: 'test' }],
      ];

      initElbLayer(collector);

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'test_event',
          data: { key: 'value' },
          context: { context: 'test' },
          trigger: 'load',
        }),
      );
    });

    test('handles object commands', () => {
      const eventObject: WalkerOS.DeepPartialEvent = {
        event: 'custom_event',
        data: { test: 'data' },
        context: { page: ['home', 0] as [string, number] },
      };

      window.elbLayer = [eventObject];

      initElbLayer(collector);

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith(eventObject);
    });

    test('ignores malformed commands', () => {
      window.elbLayer = [
        [] as unknown[], // Empty array
        [''] as unknown[], // Empty action array
        {} as WalkerOS.DeepPartialEvent, // Empty object
      ];

      initElbLayer(collector);

      // Should not throw and should not call push for invalid commands
      expect(mockPush).not.toHaveBeenCalled();
      expect(window.elbLayer).toHaveLength(0);
    });
  });

  describe('Source Integration', () => {
    test('initializes elbLayer by default', async () => {
      expect(window.elbLayer).toBeUndefined();

      await createBrowserSource(collector);

      expect(window.elbLayer).toBeDefined();
      expect(Array.isArray(window.elbLayer)).toBe(true);
    });

    test('uses custom elbLayer name from settings', async () => {
      await createBrowserSource(collector, { elbLayer: 'myCustomLayer' });

      expect((window as any).myCustomLayer).toBeDefined();
      expect(Array.isArray((window as any).myCustomLayer)).toBe(true);
      expect(window.elbLayer).toBeUndefined();
    });

    test('can disable elbLayer initialization', async () => {
      await createBrowserSource(collector, { elbLayer: false });

      expect(window.elbLayer).toBeUndefined();
    });

    test('processes pre-initialization commands', async () => {
      // Commands pushed before source initialization
      window.elbLayer = [
        ['walker run', { consent: { marketing: true } }],
        ['page', 'view', 'load'],
      ];

      await createBrowserSource(collector, { pageview: false });

      expect(mockPush).toHaveBeenCalledTimes(1); // walker run is skipped on first initialization
      expect(window.elbLayer).toHaveLength(0);
    });
  });

  describe('Event Structure', () => {
    test('creates proper WalkerOS.Event structure for regular events', () => {
      window.elbLayer = [
        ['entity_name', { prop: 'value' }, 'trigger_type', { ctx: 'context' }],
      ];

      initElbLayer(collector);

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'entity_name',
          data: { prop: 'value' },
          context: { ctx: 'context' },
          trigger: 'trigger_type',
        }),
      );
    });

    test('passes walker commands directly', () => {
      window.elbLayer = [
        ['walker user', { id: 'user123' }, 'options', { context: 'test' }],
      ];

      initElbLayer(collector);

      expect(mockPush).toHaveBeenCalledWith('walker user', { id: 'user123' });
    });
  });

  describe('Error Handling', () => {
    test('handles errors gracefully without breaking', () => {
      // Mock push to throw error
      mockPush.mockImplementation(() => {
        throw new Error('Push failed');
      });

      window.elbLayer = [
        ['test', 'data'],
        ['another', 'command'],
      ];

      // Should not throw
      expect(() => {
        initElbLayer(collector);
      }).not.toThrow();

      // Commands should still be cleared
      expect(window.elbLayer).toHaveLength(0);
    });

    test('handles circular references in commands', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      window.elbLayer = [['test', circular]];

      expect(() => {
        initElbLayer(collector);
      }).not.toThrow();
    });
  });

  describe('Arguments Object Support', () => {
    test('processes IArguments objects correctly', () => {
      function testElb(...args: unknown[]) {
        (window.elbLayer = window.elbLayer || []).push(arguments);
      }

      testElb('test_event', { key: 'value' }, 'load');

      initElbLayer(collector);

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'test_event',
          data: { key: 'value' },
          trigger: 'load',
        }),
      );
    });

    test('enhanced elbLayer.push processes arguments immediately', () => {
      initElbLayer(collector);

      function testElb(...args: unknown[]) {
        window.elbLayer.push(arguments);
      }

      testElb('immediate_event', { test: true });

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'immediate_event',
          data: { test: true },
        }),
      );
    });
  });

  describe('Element Data Resolution', () => {
    test('extracts data from elements', () => {
      document.body.innerHTML = `
        <div data-elb="product" data-elb-product="id:123;name:Test Product">
          <button>Buy Now</button>
        </div>
      `;

      const element = document.querySelector(
        'div[data-elb="product"]',
      ) as Element;

      window.elbLayer = [['product', element]];

      initElbLayer(collector);

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'product',
          data: expect.objectContaining({
            id: 123, // Values are cast by castValue utility
            name: 'Test Product',
          }),
        }),
      );
    });

    test('page events get pathname id', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/test-page' },
        writable: true,
      });

      window.elbLayer = [['page', 'view']];

      initElbLayer(collector);

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'page',
          data: expect.objectContaining({
            id: '/test-page',
          }),
        }),
      );
    });

    test('walker on command registers pageview callback when pageview enabled', async () => {
      // Set up location mock
      Object.defineProperty(window, 'location', {
        value: { pathname: '/walker-run-test' },
        writable: true,
      });

      // Initialize source with pageview enabled
      await createBrowserSource(collector, { pageview: true });

      // Check that walker on command was called to register the callback
      expect(mockPush).toHaveBeenCalledWith(
        'walker on',
        'run',
        expect.any(Function),
      );

      // Get the registered callback from the mock call
      const walkerOnCall: any[] | undefined = mockPush.mock.calls.find(
        (call: any) => call[0] === 'walker on' && call[1] === 'run',
      );
      expect(walkerOnCall).toBeDefined();

      const runCallback = walkerOnCall![2] as On.RunFn;

      // Clear mock to test callback behavior
      mockPush.mockClear();

      // Test the callback directly
      runCallback(collector);

      // Should have triggered a pageview
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'page view',
          data: expect.objectContaining({
            id: '/walker-run-test',
          }),
          trigger: 'load',
        }),
      );
    });
  });

  describe('Performance', () => {
    test('handles large number of commands efficiently', () => {
      const commands = [];
      for (let i = 0; i < 1000; i++) {
        commands.push([`event_${i}`, { index: i }]);
      }

      window.elbLayer = commands;

      const startTime = performance.now();
      initElbLayer(collector);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should process in under 100ms
      expect(mockPush).toHaveBeenCalledTimes(1000);
      expect(window.elbLayer).toHaveLength(0);
    });
  });
});
