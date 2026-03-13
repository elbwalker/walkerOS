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

  // Impression trigger needs IntersectionObserver — tested separately
  const supported = Object.entries(examples.step).filter(
    ([, ex]) => (ex.in as Record<string, unknown>).trigger !== 'impression',
  );

  it.each(supported)('%s', async (name, example) => {
    const input = example.in as Record<string, unknown>;
    const expected = example.out as {
      name: string;
      data?: Record<string, unknown>;
      trigger?: string;
      entity: string;
      action: string;
    };

    const env = { window, document, localStorage };
    const isLoad = !input.trigger || input.trigger === 'load';

    // Run trigger — returns void for load, function for interactive
    const postInit = examples.trigger(example.in, env);

    // Init source with appropriate config
    await createBrowserSource(collector, {
      pageview: isLoad && !!input.url,
    });

    // Fire post-init trigger (click, submit, etc.)
    if (typeof postInit === 'function') postInit();

    const call = mockPush.mock.calls.find(
      (c) => (c[0] as WalkerOS.DeepPartialEvent).name === expected.name,
    );
    expect(call).toBeDefined();
    const pushed = call![0] as WalkerOS.DeepPartialEvent;
    expect(pushed.name).toBe(expected.name);
    if (expected.data) {
      expect(pushed.data).toEqual(expect.objectContaining(expected.data));
    }
  });
});
