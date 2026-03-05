import { startFlow } from '@walkeros/collector';
import type { WalkerOS, Collector } from '@walkeros/core';
import {
  createMockPush,
  createMockCommand,
  createSessionSource,
} from './test-utils';
import { examples } from '../dev';

describe('Step Examples', () => {
  let collectedEvents: WalkerOS.Event[];
  let collector: Collector.Instance;

  beforeEach(async () => {
    collectedEvents = [];
    const mockPush = createMockPush(collectedEvents);
    const mockCommand = createMockCommand();

    ({ collector } = await startFlow({ tagging: 2 }));
    collector.push = mockPush;
    collector.command = mockCommand;
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const expected = example.out as {
      name: string;
      entity: string;
      action: string;
      data: Record<string, unknown>;
    };

    // Init without consent to get immediate session push
    // (step examples document the output shape; consent delays push)
    await createSessionSource(collector, {
      settings: { storage: false },
    });

    const event = collectedEvents.find((e) => e.name === expected.name);
    expect(event).toBeDefined();
    expect(event!.name).toBe(expected.name);
    expect(event!.entity).toBe(expected.entity);
    expect(event!.action).toBe(expected.action);
    // Check structural properties (exact values like id/count depend on state)
    expect(event!.data.isStart).toBe(true);
    expect(typeof event!.data.id).toBe('string');
    expect(typeof event!.data.start).toBe('number');
  });
});
