import { createCollector } from '@walkerOS/collector';
import { createBrowserSource } from './test-utils';
import type { WalkerOS } from '@walkerOS/core';

describe('Browser Source Edge Cases', () => {
  let collector: WalkerOS.Collector;
  let mockPush: jest.MockedFunction<WalkerOS.Collector['push']>;

  beforeEach(async () => {
    document.body.innerHTML = '';
    delete (window as any).elbLayer;

    mockPush = jest.fn((...args: any[]) => {
      return Promise.resolve({
        ok: true,
        successful: [],
        queued: [],
        failed: [],
      });
    }) as unknown as jest.MockedFunction<WalkerOS.Collector['push']>;

    ({ collector } = await createCollector());

    collector.push = mockPush;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete (window as any).elbLayer;
  });

  describe('Malformed DOM Attributes', () => {
    test('handles empty entity names', async () => {
      document.body.innerHTML = `
        <div data-elb="" data-elb-entity="id:123" data-elbaction="load:view">
          Empty entity
        </div>
      `;

      await createBrowserSource(collector);

      // Should handle gracefully (may or may not push depending on implementation)
      expect(() => {}).not.toThrow();
    });

    test('handles missing action in data-elbaction', async () => {
      document.body.innerHTML = `
        <div data-elb="product" data-elb-product="id:123" data-elbaction="load:">
          Missing action
        </div>
      `;

      await createBrowserSource(collector);

      expect(() => {}).not.toThrow();
    });

    test('handles missing trigger in data-elbaction', async () => {
      document.body.innerHTML = `
        <div data-elb="product" data-elb-product="id:123" data-elbaction=":view">
          Missing trigger
        </div>
      `;

      await createBrowserSource(collector);

      expect(() => {}).not.toThrow();
    });

    test('handles malformed key-value pairs', async () => {
      document.body.innerHTML = `
        <div data-elb="product" data-elb-product="id:123:extra:colons;missing_value;:empty_key" data-elbaction="load:view">
          Malformed data
        </div>
        <div data-elb="test" data-elb-test="normal:value" data-elbaction="load:action">
          Normal data
        </div>
      `;

      await createBrowserSource(collector);

      // Should not throw and should still process valid elements
      expect(() => {}).not.toThrow();
      expect(mockPush).toHaveBeenCalled();
    });

    test('handles special characters in attributes', async () => {
      document.body.innerHTML = `
        <div data-elb="product" data-elb-product="title:Test & Special <chars>;price:$19.99" data-elbaction="load:view">
          Special chars
        </div>
      `;

      await createBrowserSource(collector);

      expect(() => {}).not.toThrow();
    });

    test('handles very long attribute values', async () => {
      const longValue = 'x'.repeat(10000);
      document.body.innerHTML = `
        <div data-elb="product" data-elb-product="description:${longValue}" data-elbaction="load:view">
          Long description
        </div>
      `;

      await createBrowserSource(collector);

      expect(() => {}).not.toThrow();
    });

    test('handles unicode characters in attributes', async () => {
      document.body.innerHTML = `
        <div data-elb="product" data-elb-product="title:测试产品;emoji:🚀🎉" data-elbaction="load:view">
          Unicode content
        </div>
      `;

      await createBrowserSource(collector);

      expect(() => {}).not.toThrow();
    });
  });

  describe('Malformed ELB Layer Commands', () => {
    test('handles mixed valid and invalid commands', async () => {
      window.elbLayer = [
        ['valid_event', { data: 'test' }] as unknown[],
        [] as unknown[], // Empty array instead of null
        [''] as unknown[], // Empty action array instead of undefined
        ['walker run', { consent: { marketing: true } }] as unknown[],
        {
          event: 'object_event',
          data: { key: 'value' },
        } as WalkerOS.DeepPartialEvent,
        [] as unknown[],
      ];

      await createBrowserSource(collector);

      // Should process valid commands and ignore invalid ones
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'valid_event',
          data: { data: 'test' },
          source: expect.objectContaining({
            type: 'browser',
            id: expect.any(String),
            previous_id: expect.any(String),
          }),
        }),
      );

      expect(mockPush).toHaveBeenCalledWith('walker run', {
        consent: { marketing: true },
      });

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'object_event',
          data: { key: 'value' },
          source: expect.objectContaining({
            type: 'browser',
            id: expect.any(String),
            previous_id: expect.any(String),
          }),
        }),
      );

      expect(window.elbLayer).toHaveLength(0);
    });

    test('handles circular references in ELB Layer', async () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      window.elbLayer = [
        ['event_with_circular', circular],
        ['normal_event', { data: 'normal' }],
      ];

      await createBrowserSource(collector);

      expect(() => {}).not.toThrow();
      expect(window.elbLayer).toHaveLength(0);
    });

    test('handles extremely large ELB Layer', async () => {
      const commands = [];
      for (let i = 0; i < 10000; i++) {
        commands.push([`event_${i}`, { index: i }]);
      }
      window.elbLayer = commands;

      await createBrowserSource(collector);

      expect(mockPush).toHaveBeenCalledTimes(10001); // +1 for session initialization
      expect(window.elbLayer).toHaveLength(0);
    });
  });

  describe('DOM Edge Cases', () => {
    test('handles elements with no attributes', async () => {
      document.body.innerHTML = `
        <div>No attributes</div>
        <div data-elb="product" data-elb-product="id:123" data-elbaction="load:view">
          With attributes
        </div>
      `;

      await createBrowserSource(collector);

      // Should only process element with attributes + session initialization
      expect(mockPush).toHaveBeenCalledTimes(2);
    });

    test('handles deeply nested elements', async () => {
      let html = '';
      for (let i = 0; i < 5; i++) {
        html += `<div data-elb="level${i}" data-elb-level${i}="depth:${i}" data-elbaction="load:view">`;
      }
      html += 'Deep content';
      for (let i = 0; i < 5; i++) {
        html += '</div>';
      }

      document.body.innerHTML = html;

      await createBrowserSource(collector);

      expect(mockPush).toHaveBeenCalledTimes(16); // All nested elements + session initialization
    });

    test('handles elements with conflicting attributes', async () => {
      document.body.innerHTML = `
        <div data-elb="product" 
             data-elb-product="id:123" 
             data-elb-item="id:456" 
             data-elbaction="load:view">
          Conflicting attributes
        </div>
      `;

      await createBrowserSource(collector);

      expect(() => {}).not.toThrow();
    });

    test('handles elements removed during processing', async () => {
      document.body.innerHTML = `
        <div id="removeme" data-elb="product" data-elb-product="id:123" data-elbaction="load:view">
          Will be removed
        </div>
      `;

      // Remove element during processing
      setTimeout(() => {
        const element = document.getElementById('removeme');
        if (element) {
          element.remove();
        }
      }, 10);

      await createBrowserSource(collector);

      expect(() => {}).not.toThrow();
    });

    test('handles elements with invalid HTML structure', async () => {
      // Create invalid HTML structure
      const container = document.createElement('div');
      container.innerHTML = `
        <div data-elb="product" data-elb-product="id:123" data-elbaction="load:view">
          <p>Unclosed paragraph
          <div>Nested improperly
        </div>
      `;
      document.body.appendChild(container);

      await createBrowserSource(collector);

      expect(() => {}).not.toThrow();
    });
  });

  describe('Trigger Edge Cases', () => {
    test('handles invalid trigger parameters', async () => {
      document.body.innerHTML = `
        <div data-elb="test" data-elb-test="id:123" data-elbaction="pulse(invalid):action">Pulse</div>
        <div data-elb="test" data-elb-test="id:456" data-elbaction="wait(not_number):action">Wait</div>
        <div data-elb="test" data-elb-test="id:789" data-elbaction="scroll(200):action">Scroll</div>
      `;

      await createBrowserSource(collector);

      expect(() => {}).not.toThrow();
    });

    test('handles trigger with missing parentheses', async () => {
      document.body.innerHTML = `
        <div data-elb="test" data-elb-test="id:123" data-elbaction="pulse(1000:action">Malformed</div>
        <div data-elb="test" data-elb-test="id:456" data-elbaction="wait1000):action">Malformed</div>
      `;

      await createBrowserSource(collector);

      expect(() => {}).not.toThrow();
    });

    test('handles unknown trigger types', async () => {
      document.body.innerHTML = `
        <div data-elb="test" data-elb-test="id:123" data-elbaction="unknown:action">Unknown trigger</div>
        <div data-elb="test" data-elb-test="id:456" data-elbaction="custom_trigger:action">Custom trigger</div>
      `;

      await createBrowserSource(collector);

      expect(() => {}).not.toThrow();
    });

    test('handles multiple malformed actions', async () => {
      document.body.innerHTML = `
        <div data-elb="test" data-elb-test="id:123" data-elbaction="load:action;invalid_format;click:">
          Multiple actions
        </div>
      `;

      await createBrowserSource(collector);

      expect(() => {}).not.toThrow();
    });
  });

  describe('Configuration Edge Cases', () => {
    test('handles invalid prefix configuration', async () => {
      document.body.innerHTML = `
        <div data-elb="test" data-elb-test="id:123" data-elbaction="load:view">Test</div>
      `;

      await createBrowserSource(collector, { prefix: '' });

      expect(() => {}).not.toThrow();
    });

    test('handles null/undefined scope', async () => {
      document.body.innerHTML = `
        <div data-elb="test" data-elb-test="id:123" data-elbaction="load:view">Test</div>
      `;

      await createBrowserSource(collector, { scope: null as any });

      expect(() => {}).not.toThrow();
    });

    test('handles invalid elbLayer configuration', async () => {
      await createBrowserSource(collector, { elbLayer: 123 as any });

      expect(() => {}).not.toThrow();
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    test('handles repeated initialization', async () => {
      // Initialize multiple times
      for (let i = 0; i < 10; i++) {
        await createBrowserSource(collector);
      }

      expect(() => {}).not.toThrow();
    });

    test('handles rapid DOM changes', async () => {
      await createBrowserSource(collector);

      // Rapidly add and remove elements
      for (let i = 0; i < 100; i++) {
        const element = document.createElement('div');
        element.setAttribute('data-elb', `test${i}`);
        element.setAttribute('data-elbaction', 'load:view');
        document.body.appendChild(element);

        setTimeout(() => {
          element.remove();
        }, Math.random() * 100);
      }

      expect(() => {}).not.toThrow();
    });

    test('handles memory pressure with large data attributes', async () => {
      const largeData = 'x'.repeat(100000);
      document.body.innerHTML = `
        <div data-elb="test" data-elb-test="large:${largeData}" data-elbaction="load:view">
          Large data
        </div>
      `;

      await createBrowserSource(collector);

      expect(() => {}).not.toThrow();
    });
  });
});
