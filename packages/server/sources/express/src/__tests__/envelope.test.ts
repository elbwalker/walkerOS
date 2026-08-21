import type { Trigger, WalkerOS, Transformer } from '@walkeros/core';
import { examples } from '../dev';
import type { Content, Result } from '../examples/trigger';
import { sourceExpress } from '../index';

// One request body, N events. The shared envelope contract, carried as an
// identical behavior list by all four server sources.

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

  // The pin that stops a count-based dispatch rule from silently switching a
  // one-element batch to the single-event response body. Every source carries
  // this; express is the one every deployed client flow uses.
  it('keeps the batch response shape for a single-element batch', async () => {
    const trigger = await boot(false);

    const result = await trigger({
      method: 'POST',
      path: '/collect',
      body: { batch: [{ name: 'page view' }] },
    });

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty('processed', 1);
    expect(result.body).not.toHaveProperty('timestamp');
  });

  it('answers 200 with processed 0 for an explicit empty batch', async () => {
    const trigger = await boot(false);

    const result = await trigger({
      method: 'POST',
      path: '/collect',
      body: { batch: [] },
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ processed: 0 });
    expect(captured).toHaveLength(0);
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
