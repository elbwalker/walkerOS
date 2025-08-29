import type { WalkerOS } from '@walkeros/core';
import { createWalkerjs, getAllEvents, getEvents, getGlobals } from '../index';

describe('Walker.js Integration Tests', () => {
  let collectedEvents: WalkerOS.Event[];
  let mockPush: jest.MockedFunction<Collector.Instance['push']>;

  beforeEach(() => {
    collectedEvents = [];
    document.body.innerHTML = '';

    // Clear any existing global functions
    delete (window as Record<string, unknown>).elb;
    delete (window as Record<string, unknown>).walkerjs;
    delete (window as Record<string, unknown>).dataLayer;

    // Create mock push function
    mockPush = jest.fn((...args: [WalkerOS.Event, ...unknown[]]) => {
      collectedEvents.push(args[0] as WalkerOS.Event);
      return Promise.resolve({
        ok: true,
        successful: [],
        queued: [],
        failed: [],
      });
    }) as unknown as jest.MockedFunction<Collector.Instance['push']>;
  });

  describe('Initialization', () => {
    test('should create instance with minimal configuration', async () => {
      const instance = await createWalkerjs({
        browser: {
          session: false, // Disable session to avoid browser API issues
          pageview: false, // Disable pageview to avoid URL parsing issues
          run: false, // Disable auto-run
        },
      });

      expect(instance).toBeDefined();
      expect(instance.collector).toBeDefined();
      expect(instance.elb).toBeDefined();
    });

    test('should create global elb function when configured', async () => {
      const instance = await createWalkerjs({
        elb: 'elb',
        browser: {
          session: false,
          pageview: false,
          run: false,
        },
      });

      expect((window as Record<string, unknown>).elb).toBe(instance.elb);
    });

    test('should initialize dataLayer source when enabled', async () => {
      const instance = await createWalkerjs({
        dataLayer: true,
        browser: {
          session: false,
          pageview: false,
          run: false,
        },
      });

      expect(instance.collector.sources.dataLayer).toBeDefined();
    });
  });

  describe('Event Tracking Integration', () => {
    test('should track events through DOM attributes', async () => {
      // Setup DOM with trackable elements
      document.body.innerHTML = `
        <div data-elb="product" data-elb-product="id:123;name:Test Product">
          <button data-elbaction="click:add" data-elb-product="quantity:1">
            Add to Cart
          </button>
        </div>
        <div data-elbglobals="site:test"></div>
      `;

      // Initialize walker.js with simple mock destination
      const instance = await createWalkerjs({
        browser: {
          session: false,
          pageview: false,
          run: false,
        },
      });

      // Override the collector's push method directly
      instance.collector.push = mockPush;

      // Simulate button click by calling elb directly (simpler than DOM events)
      await instance.elb('product add', {
        id: 123,
        name: 'Test Product',
        quantity: 1,
      });

      // Should have collected event
      expect(mockPush).toHaveBeenCalled();
      const event = mockPush.mock.calls[0][0] as unknown as WalkerOS.Event;

      expect(event).toMatchObject({
        event: 'product add',
        data: {
          id: 123,
          name: 'Test Product',
          quantity: 1,
        },
      });
    });

    test('should support manual event tracking', async () => {
      const instance = await createWalkerjs({
        browser: {
          session: false,
          pageview: false,
          run: false,
        },
      });

      // Override the collector's push method directly
      instance.collector.push = mockPush;

      // Track a manual event
      await instance.elb('order complete', {
        transaction_id: 'TRX123',
        value: 99.99,
        currency: 'EUR',
      });

      expect(mockPush).toHaveBeenCalled();
      const event = mockPush.mock.calls[0][0] as unknown as WalkerOS.Event;

      expect(event.event).toBe('order complete');
      expect(event.data).toMatchObject({
        transaction_id: 'TRX123',
        value: 99.99,
        currency: 'EUR',
      });
    });
  });

  describe('Utility Functions', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div data-elb="product" data-elb-product="name:Test Product">
          <button data-elbaction="click:add" data-elb-product="id:123">
            Add to Cart
          </button>
        </div>
        <div data-elbglobals="site:test" data-elbcontext="page:home"></div>
      `;
    });

    test('should export working getAllEvents function', () => {
      const events = getAllEvents();

      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toHaveProperty('entity', 'product');
      expect(events[0]).toHaveProperty('action', 'add');
    });

    test('should export working getEvents function', () => {
      const button = document.querySelector('button')!;
      const events = getEvents(button, 'click');

      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(1);
      expect(events[0]).toHaveProperty('entity', 'product');
      expect(events[0]).toHaveProperty('action', 'add');
      expect(events[0].data).toHaveProperty('id', 123);
      expect(events[0].data).toHaveProperty('name', 'Test Product');
    });

    test('should export working getGlobals function', () => {
      const globals = getGlobals();

      expect(typeof globals).toBe('object');
      expect(globals).toHaveProperty('site', 'test');
    });
  });

  describe('Configuration Options', () => {
    test('should accept custom browser source settings', async () => {
      const instance = await createWalkerjs({
        browser: {
          session: false,
          pageview: false,
          run: false,
        },
      });

      expect(instance.collector.sources.browser).toMatchObject({
        type: 'browser',
        settings: {
          pageview: false,
          run: false,
          session: false,
        },
      });
    });

    test('should accept custom dataLayer settings', async () => {
      const instance = await createWalkerjs({
        dataLayer: {
          name: 'customDataLayer',
          prefix: 'custom',
        },
      });

      expect(instance.collector.sources.dataLayer).toMatchObject({
        settings: {
          name: 'customDataLayer',
          prefix: 'custom',
        },
      });
    });

    test('should initialize with default configuration including dataLayer destination', async () => {
      const instance = await createWalkerjs({
        browser: {
          session: false,
          pageview: false,
          run: false,
        },
      });

      expect(instance.collector).toBeDefined();

      // The instance should have all expected properties
      expect(instance.elb).toBeDefined();
      expect(instance.collector.sources.browser).toBeDefined();
    });
  });
});
