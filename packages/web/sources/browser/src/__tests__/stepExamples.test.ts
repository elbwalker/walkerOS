import { startFlow } from '@walkeros/collector';
import type { WalkerOS, Collector } from '@walkeros/core';
import { createBrowserSource } from './test-utils';
import { examples } from '../dev';

describe('Step Examples', () => {
  let collector: Collector.Instance;
  let collectedEvents: WalkerOS.Event[];
  let mockPush: jest.MockedFunction<Collector.Instance['push']>;

  beforeEach(async () => {
    collectedEvents = [];
    document.body.innerHTML = '';
    (window as unknown as { elbLayer?: unknown[] }).elbLayer = undefined;

    mockPush = jest.fn().mockImplementation((...args: unknown[]) => {
      collectedEvents.push(args[0] as WalkerOS.Event);
      return Promise.resolve({ ok: true });
    }) as jest.MockedFunction<Collector.Instance['push']>;

    ({ collector } = await startFlow());
    collector.push = mockPush;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    (window as unknown as { elbLayer?: unknown[] }).elbLayer = undefined;
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const input = example.in as Record<string, unknown>;
    const expected = example.out as {
      name: string;
      data?: Record<string, unknown>;
      trigger?: string;
      entity: string;
      action: string;
    };

    if (input.trigger === 'load') {
      // Page view: set URL and init with pageview enabled
      const url = input.url as string;
      const urlObj = new URL(url);
      window.history.replaceState({}, '', urlObj.pathname);
      document.title = input.title as string;

      await createBrowserSource(collector, { pageview: true });

      const call = mockPush.mock.calls.find(
        (c) => (c[0] as WalkerOS.DeepPartialEvent).name === 'page view',
      );
      expect(call).toBeDefined();
      const pushed = call![0] as WalkerOS.DeepPartialEvent;
      expect(pushed.name).toBe(expected.name);
      if (expected.data?.id) expect(pushed.data?.id).toBe(expected.data.id);
      if (expected.data?.title)
        expect(pushed.data?.title).toBe(expected.data.title);
    } else if (input.trigger === 'click') {
      // Click event: set up DOM element with attributes, simulate click
      const attrs = input.attributes as Record<string, string>;
      const tag = ((input.element as string) || 'div').split('[')[0];
      const el = document.createElement(tag);
      for (const [key, value] of Object.entries(attrs)) {
        el.setAttribute(key, value);
      }
      document.body.appendChild(el);

      await createBrowserSource(collector, { pageview: false });

      const clickEvent = new MouseEvent('click', { bubbles: true });
      el.dispatchEvent(clickEvent);

      const call = mockPush.mock.calls.find(
        (c) => (c[0] as WalkerOS.DeepPartialEvent).name === expected.name,
      );
      expect(call).toBeDefined();
      const pushed = call![0] as WalkerOS.DeepPartialEvent;
      expect(pushed.name).toBe(expected.name);
      if (expected.data) {
        expect(pushed.data).toEqual(expect.objectContaining(expected.data));
      }
    }
  });
});
