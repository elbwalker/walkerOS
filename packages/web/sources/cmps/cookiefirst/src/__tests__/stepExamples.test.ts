import type { WalkerOS } from '@walkeros/core';
import { sourceCookieFirst } from '../index';
import { examples } from '../dev';

describe('Step Examples', () => {
  beforeEach(() => {
    (window as unknown as Record<string, unknown>).CookieFirst = undefined;
  });

  afterEach(() => {
    (window as unknown as Record<string, unknown>).CookieFirst = undefined;
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const content = example.in as Record<string, boolean>;
    const expected = example.out as WalkerOS.Consent;
    const mapping = example.mapping as
      | { settings?: Record<string, unknown> }
      | undefined;

    const instance = await examples.createTrigger({
      consent: {},
      sources: {
        cookiefirst: {
          code: sourceCookieFirst,
          config: {
            settings: {
              ...(mapping?.settings || {}),
            },
          },
        },
      },
    });

    await instance.trigger()(content as never);

    // CMP sources push walker consent — check collector state
    // Yield for detached elb('walker consent') chain
    while (!Object.keys(instance.flow!.collector.consent || {}).length)
      await Promise.resolve();

    expect(instance.flow!.collector.consent).toEqual(
      expect.objectContaining(expected),
    );
  });
});
