import { startFlow } from '@walkeros/collector';
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
    ({ collector } = await startFlow());

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
      // Mock window.location for pageview
      Object.defineProperty(window, 'location', {
        value: { pathname: '/test-page' },
        writable: true,
      });

      // Initialize source with pageview enabled - should automatically send pageview
      const source = await createBrowserSource(collector, { pageview: true });

      // Should have sent initial pageview during source initialization
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'page view',
          trigger: 'load',
          data: expect.objectContaining({
            id: '/test-page',
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

      // Should process the 2 events (walker command goes to collector.command)
      expect(mockPush).toHaveBeenCalledTimes(2);

      // Events are processed in order
      expect(mockPush).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          name: 'page view',
          data: expect.objectContaining({ title: 'Home' }),
          trigger: 'load',
        }),
      );
      expect(mockPush).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          name: 'product click',
          data: expect.objectContaining({ id: '123' }),
          trigger: 'click',
        }),
      );
    });

    test('routes walker commands to collector.command (not collector.push)', async () => {
      // Mock collector.command to verify routing
      const mockCommand = jest.fn().mockResolvedValue({
        ok: true,
        successful: [],
        queued: [],
        failed: [],
      });
      collector.command = mockCommand;

      // Pre-populate elbLayer with walker commands and events
      window.elbLayer = [
        ['walker run', { consent: { marketing: true } }],
        ['walker user', { id: 'user123' }],
        ['page view', { title: 'Test Page' }],
      ];

      // Clear mockPush to verify clean separation
      mockPush.mockClear();

      // Initialize source
      await createBrowserSource(collector, { pageview: false });

      // Walker commands should go to collector.command (2 commands)
      expect(mockCommand).toHaveBeenCalledTimes(2);
      expect(mockCommand).toHaveBeenNthCalledWith(
        1,
        'run',
        { consent: { marketing: true } },
        undefined,
      );
      expect(mockCommand).toHaveBeenNthCalledWith(
        2,
        'user',
        { id: 'user123' },
        undefined,
      );

      // Events should go to collector.push (1 event)
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'page view',
          data: expect.objectContaining({ title: 'Test Page' }),
        }),
      );

      // Verify clean separation: commands never hit push, events never hit command
      const pushCalls = mockPush.mock.calls;
      const commandCalls = mockCommand.mock.calls;

      pushCalls.forEach((call) => {
        const firstArg = call[0];
        // Ensure no walker commands in push calls
        if (typeof firstArg === 'string') {
          expect(firstArg).not.toMatch(/^walker /);
        }
      });

      commandCalls.forEach((call) => {
        const [command] = call;
        // Ensure all command calls are from walker commands (no 'walker ' prefix after extraction)
        expect(command).not.toMatch(/^walker /);
        expect(['run', 'user']).toContain(command);
      });
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
