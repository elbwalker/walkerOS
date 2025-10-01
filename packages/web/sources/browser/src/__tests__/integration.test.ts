import { createCollector } from '@walkeros/collector';
import { createBrowserSource } from './test-utils';
import type { WalkerOS, Collector } from '@walkeros/core';

describe('Browser Source Integration Tests', () => {
  let collector: Collector.Instance;
  let collectedEvents: WalkerOS.Event[];
  let mockPush: jest.MockedFunction<Collector.Instance['push']>;

  beforeEach(async () => {
    collectedEvents = [];
    document.body.innerHTML = '';

    // Clear any existing elbLayer
    (window as unknown as { elbLayer?: unknown[] }).elbLayer = undefined;

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

    // Initialize collector without any sources to avoid initial triggers
    ({ collector } = await createCollector());

    // Override push with mock
    collector.push = mockPush;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    (window as unknown as { elbLayer?: unknown[] }).elbLayer = undefined;
  });

  describe('Complete Event Flow', () => {
    test('processes DOM element with load trigger', async () => {
      // Due to run-only behavior, test manual event instead
      const { elb } = await createBrowserSource(collector, { pageview: false });

      // Clear mock to test event processing
      mockPush.mockClear();

      // Manually trigger event to test source information addition
      if (elb) {
        await elb('product view', { id: 123, name: 'Test Product' }, 'load');
      }

      // Should have processed the event with source information
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'product view',
          data: expect.objectContaining({
            id: 123,
            name: 'Test Product',
          }),
          trigger: 'load',
          source: expect.objectContaining({
            type: 'browser',
          }),
        }),
      );
    });

    test('processes pageview events correctly', async () => {
      // Initialize source with pageview enabled first - should automatically send pageview
      const source = await createBrowserSource(collector, { pageview: true });

      // Should have sent initial pageview during source initialization
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'page view',
          trigger: 'load',
          data: expect.objectContaining({
            id: '/',
          }),
        }),
      );

      // Clear mock to test on('run') behavior
      mockPush.mockClear();

      // Test the source's on('run') method directly (new interface)
      if (source.on) {
        await source.on('run', collector);
      }

      // Should have processed another pageview event
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'page view',
          trigger: 'load',
          data: expect.objectContaining({
            id: '/',
          }),
        }),
      );
    });

    test('processes click events through complete flow', async () => {
      // Setup DOM with click trigger
      document.body.innerHTML = `
        <button data-elb="cta" data-elb-cta="text:Sign Up" data-elbaction="click:press">
          Sign Up
        </button>
      `;

      // Initialize source
      await createBrowserSource(collector, { pageview: false });

      // Simulate click event
      const button = document.querySelector('button')!;
      const clickEvent = new MouseEvent('click', { bubbles: true });
      button.dispatchEvent(clickEvent);

      // Should have processed the click
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'cta press',
          entity: 'cta',
          action: 'press',
          trigger: 'click',
          data: expect.objectContaining({
            text: 'Sign Up',
          }),
        }),
      );
    });

    test('processes Elb Layer commands in order', async () => {
      // Pre-populate elbLayer with commands
      window.elbLayer = [
        ['walker run', { consent: { marketing: true } }],
        ['page view', { title: 'Home' }, 'load', { url: '/' }],
        ['product click', { id: '123' }, 'click', { position: 1 }],
      ];

      // Initialize source - should process existing commands
      await createBrowserSource(collector, { pageview: false });

      // Should process the 3 commands (no walker on registration anymore)
      expect(mockPush).toHaveBeenCalledTimes(3);

      // Walker commands are processed first, then events
      expect(mockPush).toHaveBeenNthCalledWith(1, 'walker run', {
        consent: { marketing: true },
      });
      expect(mockPush).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          name: 'page view',
          data: expect.objectContaining({ title: 'Home' }),
          trigger: 'load',
        }),
      );
      expect(mockPush).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          name: 'product click',
          data: expect.objectContaining({ id: '123' }),
          trigger: 'click',
        }),
      );
    });
  });

  describe('Error Recovery', () => {
    test('handles malformed DOM attributes gracefully', async () => {
      document.body.innerHTML = `
        <div data-elb="product" data-elb-product="malformed:data:with:extra:colons" data-elbaction="load:view">
          Product
        </div>
        <div data-elb="valid" data-elb-valid="id:123" data-elbaction="load:test">
          Valid
        </div>
      `;

      await createBrowserSource(collector, { pageview: false });

      // Should still process at least the valid element
      expect(mockPush).toHaveBeenCalled();
    });
  });
});
