import type { WalkerOS } from '@walkeros/core';
import { sourceUsercentrics } from '../index';
import { examples } from '../dev';

describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const triggerInfo = example.trigger as { type?: string; options?: unknown };
    const content = example.in as Record<string, unknown>;
    const expected = example.out as WalkerOS.Consent;
    const mapping = example.mapping as Record<string, unknown> | undefined;

    const instance = await examples.createTrigger({
      consent: {},
      sources: {
        usercentrics: {
          code: sourceUsercentrics,
          config: {
            settings: {
              ...(mapping?.eventName ? { eventName: mapping.eventName } : {}),
              ...(mapping?.categoryMap
                ? { categoryMap: mapping.categoryMap }
                : {}),
            },
          },
        },
      },
    });

    await instance.trigger(
      triggerInfo?.type,
      triggerInfo?.options,
    )(content as never);

    // CMP sources push walker consent — check collector state
    // Yield for detached elb('walker consent') chain
    while (!Object.keys(instance.flow!.collector.consent || {}).length)
      await Promise.resolve();

    expect(instance.flow!.collector.consent).toEqual(
      expect.objectContaining(expected),
    );
  });
});
