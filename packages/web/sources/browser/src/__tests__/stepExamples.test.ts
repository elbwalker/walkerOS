import type { Destination, WalkerOS } from '@walkeros/core';
import { sourceBrowser } from '../index';
import { examples } from '../dev';

describe('Step Examples', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    (window as unknown as { elbLayer?: unknown[] }).elbLayer = undefined;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    (window as unknown as { elbLayer?: unknown[] }).elbLayer = undefined;
  });

  // Impression needs IntersectionObserver mock — tested separately
  const supported = Object.entries(examples.step).filter(
    ([name]) => name !== 'impressionEvent',
  );

  it.each(supported)('%s', async (name, example) => {
    const triggerInfo = example.trigger as
      | { type?: string; options?: unknown }
      | undefined;
    const content = example.in as string;
    const expected = example.out as {
      name: string;
      data?: Record<string, unknown>;
      trigger?: string;
      entity?: string;
      action?: string;
      context?: Record<string, unknown>;
      globals?: Record<string, unknown>;
      nested?: unknown[];
      source?: Record<string, unknown>;
    };

    // Spy destination captures events after collector processing
    const events: WalkerOS.Event[] = [];
    const spyDestination: Destination.Instance = {
      type: 'spy',
      config: { init: true },
      push: jest.fn((event: WalkerOS.Event) => {
        events.push(JSON.parse(JSON.stringify(event)));
      }),
    };

    const instance = await examples.createTrigger({
      consent: { functional: true, marketing: true, analytics: true },
      sources: {
        browser: {
          code: sourceBrowser,
          config: {
            settings: {
              pageview: triggerInfo?.type === 'load' && !!triggerInfo?.options,
              scope: document,
            },
          },
        },
      },
      destinations: {
        spy: { code: spyDestination },
      },
    });

    await instance.trigger(triggerInfo?.type, triggerInfo?.options)(content);

    // The browser source pushes events via a detached promise chain:
    // dispatchEvent → triggerClick → handleTrigger → elb() (fire-and-forget)
    // The elb() promise is never awaited by pushCommand, so it floats.
    // Each `await Promise.resolve()` drains one microtask from that chain.
    // Only microtask yields work here — setTimeout/process.nextTick/setImmediate
    // hang because the elbLayer's microtask cycle prevents macrotasks from firing.
    // Jest's 5000ms test timeout is the safety net if events never arrive.
    while (!events.find((e) => e.name === expected.name))
      await Promise.resolve();

    expect(instance.flow).toBeDefined();

    const found = events.find((e) => e.name === expected.name)!;

    if (expected.data) {
      expect(found.data).toEqual(expect.objectContaining(expected.data));
    }
    if (expected.entity) {
      expect(found.entity).toBe(expected.entity);
    }
    if (expected.action) {
      expect(found.action).toBe(expected.action);
    }
    if (expected.trigger) {
      expect(found.trigger).toBe(expected.trigger);
    }
    if (expected.nested) {
      expect(found.nested).toEqual(
        expect.arrayContaining(
          expected.nested.map((n) => expect.objectContaining(n as object)),
        ),
      );
    }
    if (expected.context) {
      expect(found.context).toEqual(expect.objectContaining(expected.context));
    }
    if (expected.globals) {
      expect(found.globals).toEqual(expect.objectContaining(expected.globals));
    }
    if (expected.source) {
      expect(found.source).toEqual(expect.objectContaining(expected.source));
    }
  });
});
