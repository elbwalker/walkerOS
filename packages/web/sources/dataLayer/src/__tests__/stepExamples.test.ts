import type { Destination, WalkerOS } from '@walkeros/core';
import { sourceDataLayer } from '../index';
import { examples } from '../dev';

describe('Step Examples', () => {
  beforeEach(() => {
    (window as unknown as { dataLayer?: unknown[] }).dataLayer = undefined;
  });

  afterEach(() => {
    (window as unknown as { dataLayer?: unknown[] }).dataLayer = undefined;
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const expected = example.out as {
      name: string;
      data?: Record<string, unknown>;
      entity?: string;
      action?: string;
    };

    const events: WalkerOS.Event[] = [];
    const spyDestination: Destination.Instance = {
      type: 'spy',
      config: { init: true },
      push: jest.fn((event: WalkerOS.Event) => {
        events.push(JSON.parse(JSON.stringify(event)));
      }),
    };

    const instance = await examples.createTrigger({
      consent: { functional: true },
      sources: {
        dataLayer: {
          code: sourceDataLayer,
          config: { settings: {} },
        },
      },
      destinations: { spy: { code: spyDestination } },
    });

    await instance.trigger()(example.in);

    // DataLayer interceptor pushes via tryCatch — may be detached
    while (!events.find((e) => e.name === expected.name))
      await Promise.resolve();

    const found = events.find((e) => e.name === expected.name);
    expect(found).toBeDefined();

    if (expected.data) {
      expect(found!.data).toEqual(expect.objectContaining(expected.data));
    }
    if (expected.entity) expect(found!.entity).toBe(expected.entity);
    if (expected.action) expect(found!.action).toBe(expected.action);
  });
});
