import { startFlow } from '@walkeros/collector';
import { Source } from '@walkeros/core';
import type { Destination, RespondFn } from '@walkeros/core';
import type { Request, Response } from 'express';
import { sourceExpress } from '../index';
import type { Types as ExpressTypes } from '../types';

/**
 * Per-method `async` resolution at the express boundary, proven through a
 * real `startFlow`: GET defaults to synchronous so a step's respond wins
 * over the GIF fallback, POST defaults to respond-first, and a
 * `{ GET?, POST? }` record overrides one method without touching the other.
 */
type ResponderTypes = Destination.Types<
  unknown,
  unknown,
  { respond?: RespondFn }
>;

const ASSET_EVENT = 'asset get';

function createHarness(asyncConfig?: boolean | Record<string, boolean>) {
  const order: string[] = [];

  // Serves real content for the asset event only; records every delivery.
  const responder: Destination.Instance<ResponderTypes> = {
    type: 'responder',
    config: {},
    push: async (event, ctx) => {
      order.push(`delivered:${event.name}`);
      if (event.name === ASSET_EVENT) {
        ctx.env?.respond?.({
          body: 'REAL',
          status: 200,
          headers: { 'Content-Type': 'application/javascript' },
        });
      }
    },
  };

  const flow = startFlow({
    consent: { functional: true },
    sources: {
      express: {
        code: sourceExpress,
        config: {
          settings: { paths: ['/asset'] },
          ...(asyncConfig === undefined ? {} : { async: asyncConfig }),
        },
      },
    },
    destinations: {
      responder: { code: responder },
    },
  });

  const mockGet = (): Request =>
    ({
      method: 'GET',
      url: `/asset?name=${encodeURIComponent(ASSET_EVENT)}`,
      headers: {},
      get: () => undefined,
    }) as unknown as Request;

  const mockPost = (): Request =>
    ({
      method: 'POST',
      url: '/asset',
      body: { name: 'page view' },
      headers: {},
      get: () => undefined,
    }) as unknown as Request;

  const mockResponse = () => {
    const calls: { method: 'send' | 'json'; body: unknown; status: number }[] =
      [];
    const headers: Record<string, string> = {};
    let status = 200;
    const res = {
      status: (code: number) => {
        status = code;
        return res;
      },
      set: (key: string, value: string) => {
        headers[key] = value;
        return res;
      },
      send: (body?: unknown) => {
        order.push('respond');
        calls.push({ method: 'send', body, status });
        return res;
      },
      json: (body: unknown) => {
        order.push('respond');
        calls.push({ method: 'json', body, status });
        return res;
      },
    };
    return { res: res as unknown as Response, calls, headers };
  };

  return { flow, order, mockGet, mockPost, mockResponse };
}

const flushDelivery = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

describe('Express per-method async', () => {
  it('GET default awaits the push so a step response wins over the GIF', async () => {
    const harness = createHarness();
    const { collector } = await harness.flow;
    const source = Source.getSource<ExpressTypes>(collector, 'express');

    const { res, calls, headers } = harness.mockResponse();
    await source.push(harness.mockGet(), res);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ method: 'send', body: 'REAL', status: 200 });
    expect(headers['Content-Type']).toBe('application/javascript');
  });

  it('POST default responds before delivery settles', async () => {
    const harness = createHarness();
    const { collector } = await harness.flow;
    const source = Source.getSource<ExpressTypes>(collector, 'express');

    const { res, calls } = harness.mockResponse();
    await source.push(harness.mockPost(), res);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('json');
    expect(calls[0].body).toMatchObject({ success: true });
    expect(harness.order[0]).toBe('respond');

    await flushDelivery();
    expect(harness.order).toContain('delivered:page view');
  });

  it('async {POST:false} makes POST synchronous while GET keeps its sync default', async () => {
    const harness = createHarness({ POST: false });
    const { collector } = await harness.flow;
    const source = Source.getSource<ExpressTypes>(collector, 'express');

    const post = harness.mockResponse();
    await source.push(harness.mockPost(), post.res);
    expect(post.calls).toHaveLength(1);
    expect(post.calls[0].body).toMatchObject({ success: true });
    expect(harness.order.indexOf('delivered:page view')).toBeLessThan(
      harness.order.indexOf('respond'),
    );

    const get = harness.mockResponse();
    await source.push(harness.mockGet(), get.res);
    expect(get.calls).toHaveLength(1);
    expect(get.calls[0]).toEqual({ method: 'send', body: 'REAL', status: 200 });
  });

  it('async {GET:true} keeps GET respond-first: the GIF wins over the step', async () => {
    const harness = createHarness({ GET: true });
    const { collector } = await harness.flow;
    const source = Source.getSource<ExpressTypes>(collector, 'express');

    const { res, calls, headers } = harness.mockResponse();
    await source.push(harness.mockGet(), res);
    await flushDelivery();

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('send');
    expect(Buffer.isBuffer(calls[0].body)).toBe(true);
    expect(headers['Content-Type']).toBe('image/gif');
  });
});
