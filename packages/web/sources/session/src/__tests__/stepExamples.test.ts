import type { Destination, WalkerOS } from '@walkeros/core';
import { sourceSession } from '../index';
import { examples } from '../dev';

describe('Step Examples', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    // Session source needs performance.getEntriesByType('navigation')
    Object.defineProperty(window, 'performance', {
      value: {
        getEntriesByType: jest.fn().mockReturnValue([{ type: 'navigate' }]),
      },
      writable: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const triggerInfo = example.trigger as
      | { type?: string; options?: unknown }
      | undefined;
    const settings = example.in as Record<string, unknown>;
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
        session: {
          code: sourceSession,
          config: { settings },
        },
      },
      destinations: { spy: { code: spyDestination } },
    });

    await instance.trigger(
      triggerInfo?.type,
      triggerInfo?.options,
    )({} as never);

    // Session source re-fires events after consent re-apply.
    // The push is awaited through the elb chain, so events should
    // be available after the trigger call resolves.
    const found = events.find((e) => e.name === expected.name);
    expect(found).toBeDefined();

    if (expected.entity) expect(found!.entity).toBe(expected.entity);
    if (expected.action) expect(found!.action).toBe(expected.action);

    // Session data contains generated fields (id, timestamps) — use partial matching
    if (expected.data) {
      if (expected.data.isStart !== undefined)
        expect(found!.data.isStart).toBe(expected.data.isStart);
      if (expected.data.storage !== undefined)
        expect(found!.data.storage).toBe(expected.data.storage);
      if (expected.data.marketing !== undefined)
        expect(found!.data.marketing).toBe(expected.data.marketing);
      if (expected.data.source !== undefined)
        expect(found!.data.source).toBe(expected.data.source);
      if (expected.data.medium !== undefined)
        expect(found!.data.medium).toBe(expected.data.medium);
      if (expected.data.campaign !== undefined)
        expect(found!.data.campaign).toBe(expected.data.campaign);
      if (expected.data.referrer !== undefined)
        expect(found!.data.referrer).toBe(expected.data.referrer);

      // Generated fields: check type
      expect(typeof found!.data.id).toBe('string');
      expect(typeof found!.data.start).toBe('number');
    }
  });
});
