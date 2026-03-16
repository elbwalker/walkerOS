import type { WalkerOS } from '@walkeros/core';
import { sourceCookiePro } from '../index';
import { examples } from '../dev';

describe('Step Examples', () => {
  beforeEach(() => {
    const win = window as unknown as Record<string, unknown>;
    win.OptanonActiveGroups = undefined;
    win.OneTrust = undefined;
    win.Optanon = undefined;
    win.OptanonWrapper = undefined;
    (window as unknown as { elbLayer?: unknown[] }).elbLayer = undefined;
  });

  afterEach(() => {
    const win = window as unknown as Record<string, unknown>;
    win.OptanonActiveGroups = undefined;
    win.OneTrust = undefined;
    win.Optanon = undefined;
    win.OptanonWrapper = undefined;
    (window as unknown as { elbLayer?: unknown[] }).elbLayer = undefined;
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const expected = example.out as WalkerOS.Consent;
    const mapping = example.mapping as Record<string, unknown> | undefined;

    const instance = await examples.createTrigger({
      consent: {},
      sources: {
        cookiepro: {
          code: sourceCookiePro,
          config: {
            settings: {
              ...(mapping?.categoryMap
                ? { categoryMap: mapping.categoryMap }
                : {}),
            },
          },
        },
      },
    });

    await instance.trigger()(example.in as string);

    // CMP sources push walker consent — check collector state
    // Yield for detached elb('walker consent') chain
    while (!Object.keys(instance.flow!.collector.consent || {}).length)
      await Promise.resolve();

    expect(instance.flow!.collector.consent).toEqual(
      expect.objectContaining(expected),
    );
  });
});
