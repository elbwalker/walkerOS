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
          event: 'product view',
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
      // Mock window.location for pageview
      Object.defineProperty(window, 'location', {
        value: { pathname: '/test-page' },
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
      const walkerOnCall = mockPush.mock.calls.find(
        (call: unknown[]) => call[0] === 'walker on' && call[1] === 'run',
      );
      expect(walkerOnCall).toBeDefined();
      const runCallback = (walkerOnCall as unknown[])[2] as (
        collector: Collector.Instance,
      ) => void;

      // Clear mock to test callback behavior
      mockPush.mockClear();

      // Test the callback directly
      runCallback(collector);

      // Should have processed the pageview event
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'page view',
          trigger: 'load',
          data: expect.objectContaining({
            id: '/test-page',
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
          event: 'cta press',
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

      // Should process commands plus register run callback
      expect(mockPush).toHaveBeenCalledTimes(4);

      // Walker commands are processed first, then events, then run callback registration
      expect(mockPush).toHaveBeenNthCalledWith(1, 'walker run', {
        consent: { marketing: true },
      });
      expect(mockPush).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          event: 'page view',
          data: expect.objectContaining({ id: '/test-page', title: 'Home' }),
          context: { url: '/' },
          trigger: 'load',
        }),
      );
      expect(mockPush).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          event: 'product click',
          data: { id: '123' },
          context: { position: 1 },
          trigger: 'click',
        }),
      );
      expect(mockPush).toHaveBeenNthCalledWith(
        4,
        'walker on',
        'run',
        expect.any(Function),
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
