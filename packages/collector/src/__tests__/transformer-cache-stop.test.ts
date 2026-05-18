import { startFlow } from '..';
import type { Transformer, WalkerOS } from '@walkeros/core';

/**
 * Bug 3: `cache.stop: true` on a pre-collector transformer must halt the
 * pipeline, not just the local chain. Documented in
 * `website/docs/transformers/cache.mdx` ("downstream transformers and
 * destinations are skipped").
 */
describe('cache.stop: true on a pre-collector transformer halts the pipeline', () => {
  it('dedups duplicate event.id from reaching destinations', async () => {
    const destinationEvents: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      sources: {
        test: {
          code: async (context) => ({
            type: 'test',
            config: context.config,
            push: context.env.push,
          }),
          next: 'dedup',
        },
      },
      transformers: {
        dedup: {
          code: async (ctx): Promise<Transformer.Instance> => ({
            type: 'dedup',
            config: ctx.config,
            // Pass-through transformer: cache HIT is what halts the pipeline,
            // not the push body itself. The cache compares by `event.id`.
            push(event) {
              return { event };
            },
          }),
          cache: {
            stop: true,
            rules: [{ key: ['event.id'], ttl: 60 }],
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

    // First push: MISS — dedup transformer runs, event reaches destination
    await elb({ name: 'page view', id: 'evt-1', data: {} });
    expect(destinationEvents).toHaveLength(1);
    expect(destinationEvents[0].id).toBe('evt-1');

    // Second push with same event.id: HIT — pipeline halts at source.next,
    // destination must NOT receive the duplicate.
    await elb({ name: 'page view', id: 'evt-1', data: {} });
    expect(destinationEvents).toHaveLength(1);

    // Third push with different event.id: MISS — event reaches destination
    await elb({ name: 'page view', id: 'evt-2', data: {} });
    expect(destinationEvents).toHaveLength(2);
    expect(destinationEvents[1].id).toBe('evt-2');
  });

  it('keeps destination cache stop=true scoped to that destination only', async () => {
    // Destination cache `stop: true` is per-destination per the docs: other
    // destinations still receive the event. The pipeline-halt `stopped`
    // discriminator is for pre-collector chains, not destination scope.
    const dest1Events: WalkerOS.Event[] = [];
    const dest2Events: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      destinations: {
        scoped: {
          cache: {
            stop: true,
            rules: [{ key: ['event.id'], ttl: 60 }],
          },
          code: {
            type: 'scoped',
            config: {},
            push: async (event: WalkerOS.Event) => {
              dest1Events.push(event);
            },
          },
        },
        other: {
          code: {
            type: 'other',
            config: {},
            push: async (event: WalkerOS.Event) => {
              dest2Events.push(event);
            },
          },
        },
      },
    });

    // First push: both destinations receive
    await elb({ name: 'page view', id: 'evt-1', data: {} });
    expect(dest1Events).toHaveLength(1);
    expect(dest2Events).toHaveLength(1);

    // Second push same id: `scoped` skips (HIT), `other` still receives
    await elb({ name: 'page view', id: 'evt-1', data: {} });
    expect(dest1Events).toHaveLength(1);
    expect(dest2Events).toHaveLength(2);
  });
});
