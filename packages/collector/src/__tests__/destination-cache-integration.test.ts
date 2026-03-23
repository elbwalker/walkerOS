import { startFlow } from '..';
import type { WalkerOS } from '@walkeros/core';

describe('destination cache integration', () => {
  it('should deduplicate events via destination cache', async () => {
    let pushCount = 0;

    const { elb } = await startFlow({
      destinations: {
        spy: {
          code: {
            type: 'spy',
            config: {},
            push: async () => {
              pushCount++;
            },
          },
          cache: {
            rules: [{ match: '*', key: ['event.name'], ttl: 60 }],
          },
        },
      },
    });

    await elb({ name: 'page view', data: {} });
    expect(pushCount).toBe(1);

    await elb({ name: 'page view', data: {} });
    expect(pushCount).toBe(1); // Deduplicated — same event name

    await elb({ name: 'order complete', data: {} });
    expect(pushCount).toBe(2); // Different event — cache miss
  });

  it('should not deduplicate when no rule matches', async () => {
    let pushCount = 0;

    const { elb } = await startFlow({
      destinations: {
        spy: {
          code: {
            type: 'spy',
            config: {},
            push: async () => {
              pushCount++;
            },
          },
          cache: {
            rules: [
              {
                match: {
                  key: 'event.name',
                  operator: 'prefix',
                  value: 'page',
                },
                key: ['event.name'],
                ttl: 60,
              },
            ],
          },
        },
      },
    });

    // "order complete" doesn't match the prefix rule — no caching
    await elb({ name: 'order complete', data: {} });
    await elb({ name: 'order complete', data: {} });
    expect(pushCount).toBe(2);

    // "page view" matches — cached
    await elb({ name: 'page view', data: {} });
    await elb({ name: 'page view', data: {} });
    expect(pushCount).toBe(3); // Only first page view pushed
  });

  it('should deduplicate per destination independently', async () => {
    let spy1Count = 0;
    let spy2Count = 0;

    const { elb } = await startFlow({
      destinations: {
        spy1: {
          code: {
            type: 'spy1',
            config: {},
            push: async () => {
              spy1Count++;
            },
          },
          cache: {
            rules: [{ match: '*', key: ['event.name'], ttl: 60 }],
          },
        },
        spy2: {
          code: {
            type: 'spy2',
            config: {},
            push: async () => {
              spy2Count++;
            },
          },
          // No cache on spy2
        },
      },
    });

    await elb({ name: 'page view', data: {} });
    await elb({ name: 'page view', data: {} });

    expect(spy1Count).toBe(1); // Deduplicated
    expect(spy2Count).toBe(2); // No cache — both pushed
  });

  it('should use event data for cache key differentiation', async () => {
    const pushedEvents: string[] = [];

    const { elb } = await startFlow({
      destinations: {
        spy: {
          code: {
            type: 'spy',
            config: {},
            push: async (event: WalkerOS.Event) => {
              pushedEvents.push(event.name);
            },
          },
          cache: {
            rules: [
              { match: '*', key: ['event.name', 'event.data.id'], ttl: 60 },
            ],
          },
        },
      },
    });

    await elb({ name: 'product view', data: { id: 'abc' } });
    await elb({ name: 'product view', data: { id: 'abc' } });
    await elb({ name: 'product view', data: { id: 'xyz' } });

    expect(pushedEvents).toEqual([
      'product view', // First abc — MISS
      // Second abc — HIT (skipped)
      'product view', // First xyz — MISS (different key)
    ]);
  });
});
