import { startFlow } from '..';
import type { Transformer, WalkerOS } from '@walkeros/core';

describe('Transformer cache integration', () => {
  it('should cache transformer result and skip push on HIT', async () => {
    let enricherCalls = 0;
    const destinationEvents: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      transformers: {
        enricher: {
          code: async (ctx): Promise<Transformer.Instance> => ({
            type: 'enricher',
            config: ctx.config,
            push(event) {
              enricherCalls++;
              return {
                event: { ...event, data: { ...event.data, enriched: true } },
              };
            },
          }),
          cache: {
            rules: [{ match: '*', key: ['event.name'], ttl: 60 }],
          },
        },
      },
      destinations: {
        spy: {
          before: 'enricher',
          code: {
            type: 'spy',
            config: {},
            push: async (event: WalkerOS.Event) => {
              destinationEvents.push(event);
            },
          },
        },
      },
    });

    // First push: MISS — enricher runs
    await elb({ name: 'page view', data: {} });
    expect(enricherCalls).toBe(1);
    expect(destinationEvents).toHaveLength(1);
    expect(destinationEvents[0].data?.enriched).toBe(true);

    // Second push same event name: HIT — enricher skipped, cached event used
    destinationEvents.length = 0;
    await elb({ name: 'page view', data: {} });
    expect(enricherCalls).toBe(1); // Didn't increment
    expect(destinationEvents).toHaveLength(1);
    expect(destinationEvents[0].data?.enriched).toBe(true); // Still enriched from cache

    // Third push different event: MISS — enricher runs again
    destinationEvents.length = 0;
    await elb({ name: 'order complete', data: {} });
    expect(enricherCalls).toBe(2);
  });

  it('should continue chain after cached transformer', async () => {
    let enricherCalls = 0;
    let validatorCalls = 0;

    const { elb } = await startFlow({
      transformers: {
        enricher: {
          code: async (ctx): Promise<Transformer.Instance> => ({
            type: 'enricher',
            config: ctx.config,
            push(event) {
              enricherCalls++;
              return {
                event: { ...event, data: { ...event.data, enriched: true } },
              };
            },
          }),
          cache: {
            rules: [{ match: '*', key: ['event.name'], ttl: 60 }],
          },
        },
        validator: {
          code: async (ctx): Promise<Transformer.Instance> => ({
            type: 'validator',
            config: ctx.config,
            push(event) {
              validatorCalls++;
              return {
                event: { ...event, data: { ...event.data, validated: true } },
              };
            },
          }),
        },
      },
      destinations: {
        spy: {
          before: ['enricher', 'validator'],
          code: {
            type: 'spy',
            config: {},
            push: async () => {},
          },
        },
      },
    });

    // First: both run
    await elb({ name: 'page view', data: {} });
    expect(enricherCalls).toBe(1);
    expect(validatorCalls).toBe(1);

    // Second: enricher cached, validator still runs
    await elb({ name: 'page view', data: {} });
    expect(enricherCalls).toBe(1); // Cached
    expect(validatorCalls).toBe(2); // Still runs — step cache continues chain
  });

  it('should stop chain on HIT when full=true', async () => {
    let enricherCalls = 0;
    let validatorCalls = 0;
    const destinationEvents: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      transformers: {
        enricher: {
          code: async (ctx): Promise<Transformer.Instance> => ({
            type: 'enricher',
            config: ctx.config,
            push(event) {
              enricherCalls++;
              return {
                event: { ...event, data: { ...event.data, enriched: true } },
              };
            },
          }),
          cache: {
            full: true,
            rules: [{ match: '*', key: ['event.name'], ttl: 60 }],
          },
        },
        validator: {
          code: async (ctx): Promise<Transformer.Instance> => ({
            type: 'validator',
            config: ctx.config,
            push(event) {
              validatorCalls++;
              return { event };
            },
          }),
        },
      },
      destinations: {
        spy: {
          before: ['enricher', 'validator'],
          code: {
            type: 'spy',
            config: {},
            push: async (event: WalkerOS.Event) => {
              destinationEvents.push(event);
            },
          },
        },
      },
    });

    // First push: MISS — both enricher and validator run
    await elb({ name: 'page view', data: {} });
    expect(enricherCalls).toBe(1);
    expect(validatorCalls).toBe(1);
    expect(destinationEvents).toHaveLength(1);

    // Second push: HIT with full=true — chain stops, validator does NOT run
    destinationEvents.length = 0;
    await elb({ name: 'page view', data: {} });
    expect(enricherCalls).toBe(1); // Cached — not called
    expect(validatorCalls).toBe(1); // Chain stopped — not called
    // Destination still receives the cached event (chain returned it)
    expect(destinationEvents).toHaveLength(1);
    expect(destinationEvents[0].data?.enriched).toBe(true);
  });

  it('should work with source.next pre-collector chains', async () => {
    let enricherCalls = 0;
    const destinationEvents: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      sources: {
        test: {
          code: async (context) => ({
            type: 'test',
            config: context.config,
            push: context.env.push,
          }),
          next: 'enricher',
        },
      },
      transformers: {
        enricher: {
          code: async (ctx): Promise<Transformer.Instance> => ({
            type: 'enricher',
            config: ctx.config,
            push(event) {
              enricherCalls++;
              return {
                event: { ...event, data: { ...event.data, enriched: true } },
              };
            },
          }),
          cache: {
            rules: [{ match: '*', key: ['event.name'], ttl: 60 }],
          },
        },
      },
      destinations: {
        spy: {
          code: {
            type: 'spy',
            config: {},
            push: async (event: WalkerOS.Event) => {
              destinationEvents.push(event);
            },
          },
        },
      },
    });

    // First push: MISS — enricher runs
    await elb({ name: 'page view', data: {} });
    expect(enricherCalls).toBe(1);
    expect(destinationEvents).toHaveLength(1);
    expect(destinationEvents[0].data?.enriched).toBe(true);

    // Second push: HIT — enricher skipped
    destinationEvents.length = 0;
    await elb({ name: 'page view', data: {} });
    expect(enricherCalls).toBe(1);
    expect(destinationEvents).toHaveLength(1);
    expect(destinationEvents[0].data?.enriched).toBe(true);
  });
});
