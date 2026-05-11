import { startFlow } from '@walkeros/collector';
import { createBrowserSource } from './test-utils';
import { initElbLayer, drainNonWalkerEvents } from '../elbLayer';
import type { WalkerOS, Collector, On, Elb } from '@walkeros/core';

/**
 * Drives the full elbLayer drain lifecycle for unit tests.
 *
 * Under the new lifecycle, `initElbLayer` only drains `walker *` commands;
 * non-walker events stay in the queue and are drained later from the
 * source's `on('run')` handler via `drainNonWalkerEvents`. Tests that
 * exercise the queue's behaviour as a whole (legacy `initElbLayer`
 * contract) need to invoke both phases.
 */
const runFullElbLayerDrain = (
  elb: Elb.Fn,
  config: Parameters<typeof initElbLayer>[1] = {},
): void => {
  initElbLayer(elb, config);
  const win = config?.window;
  if (!win) return;
  drainNonWalkerEvents(
    elb,
    {
      prefix: config.prefix ?? 'data-elb',
      elbLayer: typeof config.name === 'string' ? config.name : undefined,
    },
    win,
    config.logger,
  );
};

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
  let mockElb: jest.MockedFunction<any>;

  beforeEach(async () => {
    // Clear any existing elbLayer
    deleteWindowElbLayer();
    collectedEvents = [];

    // Create mock push function
    mockPush = jest.fn().mockImplementation((...args: any[]) => {
      collectedEvents.push(args[0] as WalkerOS.Event);
      return Promise.resolve({
        ok: true,
      });
    }) as jest.MockedFunction<Collector.Instance['push']>;

    // Create mock elb function that handles both events and commands
    mockElb = jest.fn().mockImplementation((arg1: any, arg2?: any) => {
      // Pass through to mockPush with all arguments
      return arg2 !== undefined ? mockPush(arg1, arg2) : mockPush(arg1);
    }) as jest.MockedFunction<any>;

    // Initialize collector
    ({ collector } = await startFlow());

    // Override push with mock
    collector.push = mockPush;
    // Ensure elb source exists for tests
    if (collector.sources.elb) {
      collector.sources.elb.push = mockElb;
    }
  });

  afterEach(() => {
    // Clean up window properties
    deleteWindowElbLayer();
    (window as Window & { customLayer?: unknown }).customLayer = undefined;
  });

  describe('Elb Layer Initialization', () => {
    test('creates elbLayer array on window', () => {
      expect(getWindowElbLayer()).toBeUndefined();

      initElbLayer(mockElb, { window });

      expect(getWindowElbLayer()).toBeDefined();
      expect(Array.isArray(getWindowElbLayer())).toBe(true);
      expect(getWindowElbLayer()).toHaveLength(0);
    });

    test('uses custom layer name', () => {
      expect(
        (window as Window & { customLayer?: unknown }).customLayer,
      ).toBeUndefined();

      initElbLayer(mockElb, { name: 'customLayer', window });

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

      runFullElbLayerDrain(mockElb, { window });

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
        ['page view', { title: 'test' }] as unknown[],
        ['product click', { id: 'test' }] as unknown[],
      ]);

      runFullElbLayerDrain(mockElb, { window });

      expect(mockPush).toHaveBeenCalledTimes(2);
      expect(getWindowElbLayer()).toHaveLength(0); // Commands cleared after processing
    });

    test('processes walker commands with priority', () => {
      setWindowElbLayer([
        ['product click', { id: 'product1' }] as unknown[], // Regular event
        ['walker run', { consent: { marketing: true } }] as unknown[], // Walker command
        ['page view', { title: 'test' }] as unknown[], // Regular event
        ['walker user', { id: 'user123' }] as unknown[], // Walker command
      ]);

      runFullElbLayerDrain(mockElb, { window });

      // All commands should be processed, including walker run
      expect(mockPush).toHaveBeenCalledTimes(4);

      // Walker commands should be processed first
      expect(mockPush).toHaveBeenNthCalledWith(1, 'walker run', {
        consent: { marketing: true },
      });
      expect(mockPush).toHaveBeenNthCalledWith(2, 'walker user', {
        id: 'user123',
      });

      // Then regular events. `initElbLayer` removes walker commands
      // from the live array, so `drainNonWalkerEvents` finds anchor=-1
      // and replays both `product click` and `page view`.
      expect(mockPush).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ name: 'product click' }),
      );
      expect(mockPush).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({ name: 'page view' }),
      );
    });

    test('handles array-like commands', () => {
      setWindowElbLayer([
        ['test event', { key: 'value' }, 'load'] as unknown[],
      ]);

      runFullElbLayerDrain(mockElb, { window });

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test event',
          data: { key: 'value' },
          trigger: 'load',
        }),
      );
    });

    test('handles object commands', () => {
      const eventObject: WalkerOS.DeepPartialEvent = {
        name: 'custom event',
        data: { test: 'data' },
        context: { page: ['home', 0] as [string, number] },
      };

      setWindowElbLayer([eventObject as unknown]);

      runFullElbLayerDrain(mockElb, { window });

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith(eventObject);
    });

    test('ignores malformed commands', () => {
      setWindowElbLayer([
        [] as unknown, // Empty array
        [''] as unknown, // Empty action array
        {} as unknown, // Empty object
      ]);

      runFullElbLayerDrain(mockElb, { window });

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
        ['page view', { title: 'test' }] as unknown[],
      ]);

      // `runOnInit: true` drives the run lifecycle which drains non-walker
      // events anchored at the last `walker run`.
      await createBrowserSource(
        collector,
        { pageview: false },
        {
          runOnInit: true,
        },
      );

      // Should process all commands (no walker on registration anymore)
      expect(mockPush).toHaveBeenCalledTimes(2);
      expect(mockPush).toHaveBeenNthCalledWith(1, 'walker run', {
        consent: { marketing: true },
      });
      expect(mockPush).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ name: 'page view' }),
      );
      expect(getWindowElbLayer()).toHaveLength(0);
    });
  });

  describe('Event Structure', () => {
    test('creates proper WalkerOS.Event structure for regular events', () => {
      setWindowElbLayer([
        ['entity name', { prop: 'value' }, 'trigger_type'] as unknown[],
      ]);

      runFullElbLayerDrain(mockElb, { window });

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'entity name',
          data: { prop: 'value' },
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

      initElbLayer(mockElb, { window });

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
        ['test event', { data: 'test' }] as unknown[],
        ['another event', { data: 'test2' }] as unknown[],
      ]);

      // Should not throw
      expect(() => {
        runFullElbLayerDrain(mockElb, { window });
      }).not.toThrow();

      // Commands should still be cleared
      expect(getWindowElbLayer()).toHaveLength(0);
    });

    test('handles circular references in commands', () => {
      const circular: Record<string, unknown> = { name: 'test' };
      circular.self = circular;

      setWindowElbLayer([['test event', circular] as unknown[]]);

      expect(() => {
        initElbLayer(mockElb, { window });
      }).not.toThrow();
    });
  });

  describe('Arguments Object Support', () => {
    test('processes IArguments objects correctly', () => {
      function testElb(...args: unknown[]) {
        pushToElbLayer(arguments);
      }

      testElb('test event', { key: 'value' }, 'load');

      runFullElbLayerDrain(mockElb, { window });

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test event',
          data: { key: 'value' },
          trigger: 'load',
        }),
      );
    });

    test('enhanced elbLayer.push processes arguments immediately', () => {
      initElbLayer(mockElb, { window });

      function testElb(...args: unknown[]) {
        pushToElbLayer(arguments);
      }

      testElb('immediate event', { test: true });

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'immediate event',
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

      runFullElbLayerDrain(mockElb, { window });

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'product',
          data: expect.objectContaining({
            id: 123, // Values are cast by castValue utility
            name: 'Test Product',
          }),
        }),
      );
    });

    test('page events get pathname id', () => {
      window.history.replaceState({}, '', '/test-page');

      setWindowElbLayer([['page view'] as unknown[]]);

      runFullElbLayerDrain(mockElb, { window });

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'page view',
          data: expect.objectContaining({
            id: '/test-page',
          }),
        }),
      );
    });

    test('source sends pageview when pageview enabled', async () => {
      // Set URL path
      window.history.replaceState({}, '', '/walker-run-test');

      // Initialize source with pageview enabled
      const source = await createBrowserSource(collector, { pageview: true });

      // No pageview during init — waits for on('run')
      expect(mockPush).not.toHaveBeenCalled();

      // Trigger run — pageview fires here
      if (source.on) {
        await source.on('run', collector);
      }

      // Should have sent pageview on run
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'page view',
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
        commands.push([`event ${i}`, { index: i }] as unknown[]);
      }

      setWindowElbLayer(commands as unknown[]);

      const startTime = performance.now();
      runFullElbLayerDrain(mockElb, { window });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should process in under 100ms
      expect(mockPush).toHaveBeenCalledTimes(1000);
      expect(getWindowElbLayer()).toHaveLength(0);
    });
  });
});
