import { createCollector } from '@walkerOS/collector';
import { createBrowserSource } from './test-utils';
import type { WalkerOS } from '@walkerOS/core';

describe('Browser Source Integration Tests', () => {
  let collector: WalkerOS.Collector;
  let collectedEvents: WalkerOS.Event[];
  let mockPush: jest.MockedFunction<WalkerOS.Collector['push']>;

  beforeEach(async () => {
    collectedEvents = [];
    document.body.innerHTML = '';

    // Clear any existing elbLayer
    delete (window as any).elbLayer;

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

    // Initialize collector without any sources to avoid initial triggers
    ({ collector } = await createCollector({
      tagging: 2,
    }));

    // Override push with mock
    collector.push = mockPush;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete (window as any).elbLayer;
  });

  describe('Complete Event Flow', () => {
    test('processes DOM element with load trigger', async () => {
      // Setup DOM with load trigger
      document.body.innerHTML = `
        <div data-elb="product" data-elb-product="id:123;name:Test Product" data-elbaction="load:view">
          Product content
        </div>
      `;

      // Initialize source - should trigger load events
      await createBrowserSource(collector, { pageview: false });

      // Should have processed the load trigger
      expect(mockPush).toHaveBeenCalledTimes(1); // Only product view (pageview disabled in setup)
      expect(mockPush).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          event: 'product view',
          entity: 'product',
          action: 'view',
          trigger: 'load',
          data: expect.objectContaining({
            id: 123,
            name: 'Test Product',
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

    test('processes ELB Layer commands in order', async () => {
      // Pre-populate elbLayer with commands
      window.elbLayer = [
        ['walker run', { consent: { marketing: true } }],
        ['page', { title: 'Home' }, 'load', { url: '/' }],
        ['product', { id: '123' }, 'click', { position: 1 }],
      ];

      // Initialize source - should process existing commands
      await createBrowserSource(collector, { pageview: false });

      // Should process all commands in order
      expect(mockPush).toHaveBeenCalledTimes(3);

      // Walker command should be first
      expect(mockPush).toHaveBeenNthCalledWith(1, 'walker run', {
        consent: { marketing: true },
      });

      // Then regular events
      expect(mockPush).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          event: 'page',
          data: { title: 'Home' },
          context: { url: '/' },
          trigger: 'load',
        }),
      );

      expect(mockPush).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          event: 'product',
          data: { id: '123' },
          context: { position: 1 },
          trigger: 'click',
        }),
      );
    });

    test('handles mixed DOM and ELB Layer events', async () => {
      // Setup both DOM elements and ELB Layer commands
      document.body.innerHTML = `
        <div data-elb="banner" data-elb-banner="type:promo" data-elbaction="load:show">
          Promo banner
        </div>
      `;

      window.elbLayer = [['user', { id: 'user123' }, 'system']];

      // Initialize source
      await createBrowserSource(collector, { pageview: false });

      // Should process both ELB Layer and DOM events
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'user',
          data: { id: 'user123' },
          trigger: 'system',
        }),
      );

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'banner show',
          entity: 'banner',
          action: 'show',
          trigger: 'load',
          data: expect.objectContaining({
            type: 'promo',
          }),
        }),
      );
    });

    test('processes multiple trigger types on same element', async () => {
      document.body.innerHTML = `
        <div data-elb="product" 
             data-elb-product="id:123" 
             data-elbaction="load:view;click:select;hover:preview">
          Product
        </div>
      `;

      // Initialize source
      await createBrowserSource(collector, { pageview: false });

      // Should process load trigger immediately
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'product view',
          trigger: 'load',
        }),
      );

      // Simulate click
      const element = document.querySelector('div')!;
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'product select',
          trigger: 'click',
        }),
      );

      // Simulate hover
      element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'product preview',
          trigger: 'hover',
        }),
      );
    });
  });

  describe('Error Recovery', () => {
    test('continues processing after individual event errors', async () => {
      // Mock push to fail on first call
      let callCount = 0;
      mockPush.mockImplementation(
        (...args: Parameters<WalkerOS.Collector['push']>) => {
          callCount++;
          if (callCount === 1) {
            throw new Error('First event failed');
          }
          collectedEvents.push(args[0] as unknown as WalkerOS.Event);
          return Promise.resolve({
            ok: true,
            successful: [],
            queued: [],
            failed: [],
          });
        },
      );

      window.elbLayer = [
        ['failing_event', { will: 'fail' }],
        ['working_event', { will: 'work' }],
      ];

      // Should not throw
      await expect(
        createBrowserSource(collector, { pageview: false }),
      ).resolves.not.toThrow();

      // Should still process second event
      expect(mockPush).toHaveBeenCalledTimes(2);
    });

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

  describe('Performance', () => {
    test('handles large DOM structures efficiently', async () => {
      // Create large DOM structure
      let html = '';
      for (let i = 0; i < 100; i++) {
        html += `<div data-elb="item${i}" data-elb-item${i}="id:${i}" data-elbaction="load:view">Item ${i}</div>`;
      }
      document.body.innerHTML = html;

      const startTime = performance.now();

      await createBrowserSource(collector, { pageview: false });

      const endTime = performance.now();

      // Should process all events
      expect(mockPush).toHaveBeenCalledTimes(100);

      // Should complete in reasonable time (under 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Configuration Options', () => {
    test('respects custom prefix setting', async () => {
      document.body.innerHTML = `
        <div data-custom="test" data-custom-test="value:123" data-customaction="load:action">
          Test
        </div>
      `;

      await createBrowserSource(collector, {
        prefix: 'data-custom',
        pageview: false,
      });

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'test action',
          entity: 'test',
          action: 'action',
          data: expect.objectContaining({
            value: 123, // Should be number, not string
          }),
        }),
      );
    });

    test('respects scope limitation', async () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div data-elb="inside" data-elb-inside="location:container" data-elbaction="load:view">
          Inside
        </div>
      `;
      document.body.appendChild(container);

      // Add element outside scope
      document.body.innerHTML += `
        <div data-elb="outside" data-elb-outside="location:body" data-elbaction="load:view">
          Outside
        </div>
      `;

      await createBrowserSource(collector, {
        scope: container,
        pageview: false,
      });

      // Should only process element inside scope
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            location: 'container',
          }),
        }),
      );
    });
  });
});
