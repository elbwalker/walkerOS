import { createCollector } from '@walkeros/collector';
import { createBrowserSource } from './test-utils';
import { initElbLayer } from '../elbLayer';
import type { WalkerOS, Collector, On } from '@walkeros/core';

// Helper to access window.elbLayer safely
const getWindowElbLayer = (): unknown[] | undefined =>
  (window as unknown as { elbLayer?: unknown[] }).elbLayer;

const setWindowElbLayer = (value: unknown[]): void => {
  (window as unknown as { elbLayer: unknown[] }).elbLayer = value;
};

const deleteWindowElbLayer = (): void => {
  (window as unknown as { elbLayer?: unknown[] }).elbLayer = undefined;
};

const pushToElbLayer = (item: unknown): void => {
  const w = window as unknown as { elbLayer?: unknown[] };
  if (!w.elbLayer) w.elbLayer = [];
  w.elbLayer.push(item);
};

describe('Elb Layer', () => {
  let collectedEvents: WalkerOS.Event[];
  let collector: Collector.Instance;
  let mockPush: jest.MockedFunction<Collector.Instance['push']>;

  beforeEach(async () => {
    // Clear any existing elbLayer
    deleteWindowElbLayer();
    collectedEvents = [];

    // Create mock push function
    mockPush = jest.fn().mockImplementation((...args: unknown[]) => {
      collectedEvents.push(args[0] as WalkerOS.Event);
      return Promise.resolve({
        ok: true,
        successful: [],
        queued: [],
        failed: [],
      });
    }) as jest.MockedFunction<Collector.Instance['push']>;

    // Initialize collector
    ({ collector } = await createCollector());

    // Override push with mock
    collector.push = mockPush;
  });

  afterEach(() => {
    // Clean up window properties
    deleteWindowElbLayer();
    (window as Window & { customLayer?: unknown }).customLayer = undefined;
  });

  describe('Elb Layer Initialization', () => {
    test('creates elbLayer array on window', () => {
      expect(getWindowElbLayer()).toBeUndefined();

      initElbLayer(collector);

      expect(getWindowElbLayer()).toBeDefined();
      expect(Array.isArray(getWindowElbLayer())).toBe(true);
      expect(getWindowElbLayer()).toHaveLength(0);
    });

    test('uses custom layer name', () => {
      expect(
        (window as Window & { customLayer?: unknown }).customLayer,
      ).toBeUndefined();

      initElbLayer(collector, { name: 'customLayer' });

      expect(
        (window as Window & { customLayer?: unknown }).customLayer,
      ).toBeDefined();
      expect(
        Array.isArray(
          (window as Window & { customLayer?: unknown }).customLayer,
        ),
      ).toBe(true);
      expect(getWindowElbLayer()).toBeUndefined();
    });

    test('preserves existing elbLayer if present', () => {
      setWindowElbLayer([['existing', 'commands'] as unknown[]]);

      initElbLayer(collector);

      expect(getWindowElbLayer()).toBeDefined();
      expect(Array.isArray(getWindowElbLayer())).toBe(true);
      // Commands should be processed and cleared
      expect(getWindowElbLayer()).toHaveLength(0);
    });
  });

  describe('Command Processing', () => {
    test('processes existing commands on initialization', () => {
      // Pre-populate elbLayer with commands
      setWindowElbLayer([
        ['page', 'view', 'load'] as unknown[],
        ['product', 'click', 'click', { id: 'test' }] as unknown[],
      ]);

      initElbLayer(collector);

      expect(mockPush).toHaveBeenCalledTimes(2);
      expect(getWindowElbLayer()).toHaveLength(0); // Commands cleared after processing
    });

    test('processes walker commands with priority', () => {
      setWindowElbLayer([
        ['product', 'click', 'click'] as unknown[], // Regular event
        ['walker run', { consent: { marketing: true } }] as unknown[], // Walker command
        ['page', 'view', 'load'] as unknown[], // Regular event
        ['walker user', { id: 'user123' }] as unknown[], // Walker command
      ]);

      initElbLayer(collector);

      // All commands should be processed, including walker run
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
      setWindowElbLayer([
        [
          'test_event',
          { key: 'value' },
          'load',
          { context: 'test' },
        ] as unknown[],
      ]);

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

      setWindowElbLayer([eventObject as unknown]);

      initElbLayer(collector);

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith(eventObject);
    });

    test('ignores malformed commands', () => {
      setWindowElbLayer([
        [] as unknown, // Empty array
        [''] as unknown, // Empty action array
        {} as unknown, // Empty object
      ]);

      initElbLayer(collector);

      // Should not throw and should not call push for invalid commands
      expect(mockPush).not.toHaveBeenCalled();
      expect(getWindowElbLayer()).toHaveLength(0);
    });
  });

  describe('Source Integration', () => {
    test('initializes elbLayer by default', async () => {
      expect(getWindowElbLayer()).toBeUndefined();

      await createBrowserSource(collector);

      expect(getWindowElbLayer()).toBeDefined();
      expect(Array.isArray(getWindowElbLayer())).toBe(true);
    });

    test('uses custom elbLayer name from settings', async () => {
      await createBrowserSource(collector, { elbLayer: 'myCustomLayer' });

      expect(
        (window as Window & { myCustomLayer?: unknown }).myCustomLayer,
      ).toBeDefined();
      expect(
        Array.isArray(
          (window as Window & { myCustomLayer?: unknown }).myCustomLayer,
        ),
      ).toBe(true);
      expect(getWindowElbLayer()).toBeUndefined();
    });

    test('can disable elbLayer initialization', async () => {
      await createBrowserSource(collector, { elbLayer: false });

      expect(getWindowElbLayer()).toBeUndefined();
    });

    test('processes pre-initialization commands', async () => {
      // Commands pushed before source initialization
      setWindowElbLayer([
        ['walker run', { consent: { marketing: true } }] as unknown[],
        ['page', 'view', 'load'] as unknown[],
      ]);

      await createBrowserSource(collector, { pageview: false });

      // Should process all commands plus register the run callback
      expect(mockPush).toHaveBeenCalledTimes(3);
      expect(mockPush).toHaveBeenNthCalledWith(1, 'walker run', {
        consent: { marketing: true },
      });
      expect(mockPush).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ event: 'page' }),
      );
      expect(mockPush).toHaveBeenNthCalledWith(
        3,
        'walker on',
        'run',
        expect.any(Function),
      );
      expect(getWindowElbLayer()).toHaveLength(0);
    });
  });

  describe('Event Structure', () => {
    test('creates proper WalkerOS.Event structure for regular events', () => {
      setWindowElbLayer([
        [
          'entity_name',
          { prop: 'value' },
          'trigger_type',
          { ctx: 'context' },
        ] as unknown[],
      ]);

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
      setWindowElbLayer([
        [
          'walker user',
          { id: 'user123' },
          'options',
          { context: 'test' },
        ] as unknown[],
      ]);

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

      setWindowElbLayer([
        ['test', 'data'] as unknown[],
        ['another', 'command'] as unknown[],
      ]);

      // Should not throw
      expect(() => {
        initElbLayer(collector);
      }).not.toThrow();

      // Commands should still be cleared
      expect(getWindowElbLayer()).toHaveLength(0);
    });

    test('handles circular references in commands', () => {
      const circular: Record<string, unknown> = { name: 'test' };
      circular.self = circular;

      setWindowElbLayer([['test', circular] as unknown[]]);

      expect(() => {
        initElbLayer(collector);
      }).not.toThrow();
    });
  });

  describe('Arguments Object Support', () => {
    test('processes IArguments objects correctly', () => {
      function testElb(...args: unknown[]) {
        pushToElbLayer(arguments);
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
        pushToElbLayer(arguments);
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

      setWindowElbLayer([['product', element] as unknown[]]);

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

      setWindowElbLayer([['page', 'view'] as unknown[]]);

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
      const walkerOnCall: unknown[] | undefined = mockPush.mock.calls.find(
        (call: unknown[]) => call[0] === 'walker on' && call[1] === 'run',
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
      const commands: unknown[] = [];
      for (let i = 0; i < 1000; i++) {
        commands.push([`event_${i}`, { index: i }] as unknown[]);
      }

      setWindowElbLayer(commands as unknown[]);

      const startTime = performance.now();
      initElbLayer(collector);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should process in under 100ms
      expect(mockPush).toHaveBeenCalledTimes(1000);
      expect(getWindowElbLayer()).toHaveLength(0);
    });
  });
});
