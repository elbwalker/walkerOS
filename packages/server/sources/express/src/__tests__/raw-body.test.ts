import type { Ingest, Trigger, Transformer, WalkerOS } from '@walkeros/core';
import { examples } from '../dev';
import type { Content, Result } from '../examples/trigger';
import { sourceExpress } from '../index';

// A text/plain body is JSON when it parses (navigator.sendBeacon forces
// text/plain on JSON payloads) and raw input otherwise, so a source.before
// chain can decode it from ingest.body the way it can on the fetch, Cloud
// Function and Lambda sources.

// gtag.js batches several events into one POST, one URL-encoded hit per line.
const GTAG_URL_QUERY = { v: '2', tid: 'G-EXAMPLE', _p: 'p1', cid: 'cid-1' };
const GTAG_BATCH_BODY = [
  'en=add_to_cart&ep.currency=EUR&epn.value=19.99',
  'en=add_to_cart&ep.currency=EUR&epn.value=29.99',
].join('\n');

const TEXT_PLAIN = { 'Content-Type': 'text/plain;charset=UTF-8' };

const flushDelivery = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

describe('Express raw text/plain bodies', () => {
  let instance: Trigger.Instance<Content, Result>;
  let ingests: Ingest[];
  let captured: WalkerOS.DeepPartialEvent[];

  const boot = async (
    options: { async?: boolean; maxBatchSize?: number; decode?: boolean } = {},
  ) => {
    ingests = [];
    captured = [];
    instance = await examples.createTrigger({
      consent: { functional: true },
      sources: {
        express: {
          code: sourceExpress,
          ...(options.decode ? { before: 'decoder' } : {}),
          next: 'spy',
          config: {
            async: options.async ?? false,
            settings: {
              port: 0,
              paths: ['/g/collect', '/collect'],
              ...(options.maxBatchSize === undefined
                ? {}
                : { maxBatchSize: options.maxBatchSize }),
            },
            ingest: {
              map: {
                url: { key: 'url' },
                body: { key: 'body' },
              },
            },
          },
        },
      },
      transformers: {
        // Stands in for a request decoder such as transformer-ga4: it reads
        // the raw request from ingest and replaces the empty event.
        decoder: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'decoder',
            config: context.config,
            push: async (_event, ctx) => {
              ingests.push(ctx.ingest);
              return { event: { name: 'product add' } };
            },
          }),
        },
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

  it('hands a multi-line gtag.js body to the before chain as the raw string', async () => {
    const trigger = await boot({ decode: true });

    const result = await trigger({
      method: 'POST',
      path: '/g/collect',
      query: GTAG_URL_QUERY,
      headers: TEXT_PLAIN,
      body: GTAG_BATCH_BODY,
    });

    expect(result.status).toBe(200);
    expect(ingests).toHaveLength(1);
    expect(ingests[0].body).toBe(GTAG_BATCH_BODY);
    expect(ingests[0].url).toContain('/g/collect?v=2&tid=G-EXAMPLE');
  });

  it('hands a body-less gtag.js POST to the before chain as one request', async () => {
    const trigger = await boot({ decode: true });

    const result = await trigger({
      method: 'POST',
      path: '/g/collect',
      query: { ...GTAG_URL_QUERY, en: 'page_view' },
      headers: TEXT_PLAIN,
      body: '',
    });

    expect(result.status).toBe(200);
    expect(ingests).toHaveLength(1);
    expect(ingests[0].url).toContain('en=page_view');
  });

  it('still parses a JSON body sent as text/plain (sendBeacon)', async () => {
    const trigger = await boot();
    const event = { name: 'page view', data: { title: 'beacon' } };

    const result = await trigger({
      method: 'POST',
      path: '/collect',
      headers: TEXT_PLAIN,
      body: JSON.stringify(event),
    });

    expect(result.status).toBe(200);
    expect(captured).toEqual([expect.objectContaining(event)]);
  });

  it('keeps the batch cap for a JSON batch sent as text/plain', async () => {
    const trigger = await boot({ maxBatchSize: 1 });

    const result = await trigger({
      method: 'POST',
      path: '/collect',
      headers: TEXT_PLAIN,
      body: JSON.stringify({
        batch: [{ name: 'page view' }, { name: 'order complete' }],
      }),
    });

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      success: false,
      error: 'Batch too large. Maximum size: 1 events',
    });
    expect(captured).toHaveLength(0);
  });

  // The source.next spy sits before the collector gate, so it sees the empty
  // event either way; the gate's rejection counter is what shows the drop.
  it('acks a non-JSON text/plain body with no decoder, then rejects it at the gate (respond-first)', async () => {
    const trigger = await boot({ async: true });

    const result = await trigger({
      method: 'POST',
      path: '/collect',
      headers: TEXT_PLAIN,
      body: 'not json either',
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ success: true });

    const status = instance.flow?.collector.status;
    for (let i = 0; i < 50 && !status?.sources.express?.rejected; i++) {
      await flushDelivery();
    }
    expect(status?.sources.express?.rejected).toBe(1);
    expect(status?.failed).toBe(0);
  });

  it('answers a non-JSON text/plain body with no decoder as invalid input (sync)', async () => {
    const trigger = await boot();

    const result = await trigger({
      method: 'POST',
      path: '/collect',
      headers: TEXT_PLAIN,
      body: 'not json either',
    });

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      success: false,
      error: 'Event name is required',
    });
  });

  it('still rejects an unparseable application/json body before the pipeline', async () => {
    const trigger = await boot({ decode: true });

    const result = await trigger({
      method: 'POST',
      path: '/g/collect',
      headers: { 'Content-Type': 'application/json' },
      body: GTAG_BATCH_BODY,
    });

    expect(result.status).toBe(400);
    expect(ingests).toHaveLength(0);
  });
});
