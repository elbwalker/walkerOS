import type { Trigger, WalkerOS, Transformer } from '@walkeros/core';
import { examples } from '../dev';
import type { Content, Result } from '../examples/trigger';
import { sourceExpress } from '../index';

// One request body, N events. These six behaviors are the shared envelope
// contract; the other three sources carry an identical list.

describe('Express envelope', () => {
  let instance: Trigger.Instance<Content, Result>;
  let captured: WalkerOS.DeepPartialEvent[];

  const boot = async (async: boolean, maxBatchSize?: number) => {
    captured = [];
    instance = await examples.createTrigger({
      consent: { functional: true },
      sources: {
        express: {
          code: sourceExpress,
          next: 'spy',
          config: {
            async,
            settings: {
              port: 0,
              ...(maxBatchSize === undefined ? {} : { maxBatchSize }),
            },
          },
        },
      },
      transformers: {
        spy: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'spy',
            config: context.config,
            push: async (event) => {
              captured.push(event);
              return { event };
            },
          }),
        },
      },
    });
    return instance.trigger();
  };

  afterEach(async () => {
    if (instance?.flow) await instance.flow.collector.command('shutdown');
  });

  it('accepts a batch envelope as N events', async () => {
    const trigger = await boot(false);

    const result = await trigger({
      method: 'POST',
      path: '/collect',
      body: { batch: [{ name: 'page view' }, { name: 'order complete' }] },
    });

    expect(result.status).toBe(200);
    expect(captured.map((event) => event.name)).toEqual([
      'page view',
      'order complete',
    ]);
  });

  it('accepts a bare array as N events', async () => {
    const trigger = await boot(false);

    const result = await trigger({
      method: 'POST',
      path: '/collect',
      body: [{ name: 'page view' }, { name: 'order complete' }],
    });

    expect(result.status).toBe(200);
    expect(captured).toHaveLength(2);
  });

  it('still accepts a single event', async () => {
    const trigger = await boot(false);

    const result = await trigger({
      method: 'POST',
      path: '/collect',
      body: { name: 'page view' },
    });

    expect(result.status).toBe(200);
    expect(captured.map((event) => event.name)).toEqual(['page view']);
  });

  it('rejects an over-cap batch with 400 and pushes nothing', async () => {
    const trigger = await boot(false, 2);

    const result = await trigger({
      method: 'POST',
      path: '/collect',
      body: { batch: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] },
    });

    expect(result.status).toBe(400);
    expect(captured).toHaveLength(0);
  });

  it('answers 207 with per-index errors when one event of a batch fails', async () => {
    const trigger = await boot(false);

    const result = await trigger({
      method: 'POST',
      path: '/collect',
      body: { batch: [{ name: 'page view' }, { data: { no: 'name' } }] },
    });

    expect(result.status).toBe(207);
    expect(result.body).toMatchObject({
      success: false,
      processed: 1,
      failed: 1,
      errors: [{ index: 1 }],
    });
  });

  // The varying-value carve-out: respond-first cannot know per-index outcomes,
  // so an accepted batch answers 200 meaning "accepted", not "delivered".
  it('acknowledges a batch with 200 in respond-first mode', async () => {
    const trigger = await boot(true);

    const result = await trigger({
      method: 'POST',
      path: '/collect',
      body: { batch: [{ name: 'page view' }, { data: { no: 'name' } }] },
    });

    expect(result.status).toBe(200);
  });
});
