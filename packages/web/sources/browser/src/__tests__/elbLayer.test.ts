import { createCollector } from '@walkerOS/collector';
import { createBrowserSource } from './test-utils';
import { initElbLayer } from '../elbLayer';
import type { WalkerOS } from '@walkerOS/core';

describe('ELB Layer', () => {
  let collectedEvents: WalkerOS.Event[];
  let collector: WalkerOS.Collector;
  let mockPush: jest.MockedFunction<WalkerOS.Collector['push']>;

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
    }) as unknown as jest.MockedFunction<WalkerOS.Collector['push']>;

    // Initialize collector
    ({ collector } = await createCollector({
      tagging: 2,
    }));

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

      expect(mockPush).toHaveBeenCalledTimes(4);

      // Walker commands should be processed first
      expect(mockPush).toHaveBeenNthCalledWith(1, 'walker run', {
        consent: { marketing: true },
      });
      expect(mockPush).toHaveBeenNthCalledWith(2, 'walker user', {
        id: 'user123',
      });

      // Then regular events
      expect(mockPush).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ event: 'product' }),
      );
      expect(mockPush).toHaveBeenNthCalledWith(
        4,
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

      expect(mockPush).toHaveBeenCalledTimes(2);
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
          custom: {},
          nested: [],
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
