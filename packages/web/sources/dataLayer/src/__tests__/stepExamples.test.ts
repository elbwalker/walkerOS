import { startFlow } from '@walkeros/collector';
import type { WalkerOS, Collector } from '@walkeros/core';
import { createMockPush, createDataLayerSource } from './test-utils';
import { examples } from '../dev';

describe('Step Examples', () => {
  let collectedEvents: WalkerOS.Event[];
  let collector: Collector.Instance;

  beforeEach(async () => {
    (window as Record<string, unknown>).dataLayer = [];
    collectedEvents = [];

    const mockPush = createMockPush(collectedEvents);

    ({ collector } = await startFlow({
      tagging: 2,
    }));

    collector.push = mockPush;
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    await createDataLayerSource(collector);

    const expected = example.out as {
      name: string;
      data?: unknown;
      entity: string;
      action: string;
    };

    // Push the example input to dataLayer via trigger
    examples.trigger(example.in, { window, document, localStorage });

    expect(collectedEvents.length).toBeGreaterThan(0);
    const event = collectedEvents[collectedEvents.length - 1];
    expect(event.name).toBe(expected.name);
    expect(event.entity).toBe(expected.entity);
    expect(event.action).toBe(expected.action);
    if (expected.data) expect(event.data).toEqual(expected.data);
  });
});
