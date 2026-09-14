import { sourceFetch } from '../index';
import type { Ingest, Source, Collector } from '@walkeros/core';
import { createIngest, createMockLogger } from '@walkeros/core';
import type { Types } from '../types';

// These pin the response contract the other three sources copy: the 413
// guards and their order, the batch cap, the 207 partial-failure shape, and
// the batch response body. They are written against the behavior that ships
// today, so a refactor that changes any of it fails here rather than in a
// caller's production traffic.

function createSourceContext(
  config: Partial<Source.Config<Types>> = {},
  env: Partial<Types['env']> = {},
): Source.Context<Types> {
  const baseEnv = env as Types['env'];
  return {
    config,
    env: baseEnv,
    logger: env.logger || createMockLogger(),
    id: 'test-fetch',
    collector: {} as Collector.Instance,
    withScope: async (_raw, respond, body) => {
      const ingest: Ingest = createIngest('test-fetch');
      return body({ ...baseEnv, push: baseEnv.push, ingest, respond });
    },
  };
}

const boot = async (
  push: jest.MockedFunction<(...args: unknown[]) => unknown>,
  config: Partial<Source.Config<Types>> = {},
) =>
  sourceFetch(
    createSourceContext(config, {
      push: push as never,
      command: jest.fn() as never,
      elb: jest.fn() as never,
      logger: createMockLogger(),
    }),
  );

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://x.example/collect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('fetch envelope contract', () => {
  let mockPush: jest.MockedFunction<(...args: unknown[]) => unknown>;

  beforeEach(() => {
    mockPush = jest
      .fn()
      .mockResolvedValue({ event: { id: 'test-id' }, ok: true });
  });

  it('rejects an over-declared Content-Length before reading the body', async () => {
    const source = await boot(mockPush);
    const request = post(
      { name: 'page view' },
      { 'Content-Length': String(102400 + 1) },
    );

    const response = await source.push(request);

    expect(response.status).toBe(413);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('rejects an oversized body that under-declared its length', async () => {
    const source = await boot(mockPush);
    const request = post({
      name: 'page view',
      data: { pad: 'x'.repeat(102401) },
    });

    const response = await source.push(request);

    expect(response.status).toBe(413);
    expect(mockPush).not.toHaveBeenCalled();
  });

  // The limit is in bytes. A multi-byte body that is under the limit in
  // UTF-16 code units but over it in bytes must still be rejected.
  it('measures the body limit in UTF-8 bytes, not code units', async () => {
    const source = await boot(mockPush);
    // 60000 two-byte characters: 60000 code units, 120000 bytes, limit 102400.
    const request = post({
      name: 'page view',
      data: { pad: 'é'.repeat(60000) },
    });

    const response = await source.push(request);

    expect(response.status).toBe(413);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('rejects an over-cap batch with 400 and pushes nothing', async () => {
    const source = await boot(mockPush);
    const batch = Array.from({ length: 101 }, (_, i) => ({
      name: `page view ${i}`,
    }));

    const response = await source.push(post({ batch }));

    expect(response.status).toBe(400);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('answers 207 with per-index errors on partial failure', async () => {
    mockPush = jest
      .fn()
      .mockResolvedValueOnce({ event: { id: 'a' }, ok: true })
      .mockResolvedValueOnce({ ok: false, error: 'nope' });
    const source = await boot(mockPush);

    const response = await source.push(
      post({ batch: [{ name: 'page view' }, { name: 'order complete' }] }),
    );

    expect(response.status).toBe(207);
    expect(await response.json()).toEqual({
      success: false,
      processed: 1,
      failed: 1,
      errors: [{ index: 1, error: 'nope' }],
    });
  });

  it('answers 200 with processed and ids on a fully successful batch', async () => {
    const source = await boot(mockPush);

    const response = await source.push(
      post({ batch: [{ name: 'page view' }, { name: 'order complete' }] }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      processed: 2,
    });
    expect(mockPush).toHaveBeenCalledTimes(2);
  });

  // The pin that stops a count-based dispatch rule from silently switching a
  // one-element batch to the single-event response body.
  it('keeps the batch response shape for a single-element batch', async () => {
    const source = await boot(mockPush);

    const response = await source.push(
      post({ batch: [{ name: 'page view' }] }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toHaveProperty('processed', 1);
    expect(payload).toHaveProperty('ids');
    expect(payload).not.toHaveProperty('id');
  });

  // This source previously compacted ids, so ids[i] stopped describing the
  // caller's i-th event as soon as one event minted none.
  it('keeps ids index aligned with the submitted batch', async () => {
    mockPush = jest
      .fn()
      .mockResolvedValueOnce({ event: { id: 'a' }, ok: true })
      .mockResolvedValueOnce({ event: {}, ok: true })
      .mockResolvedValueOnce({ event: { id: 'c' }, ok: true });
    const source = await boot(mockPush);

    const response = await source.push(
      post({
        batch: [
          { name: 'page view' },
          { name: 'order complete' },
          { name: 'product view' },
        ],
      }),
    );

    expect(await response.json()).toMatchObject({ ids: ['a', null, 'c'] });
  });

  it('accepts a bare array as N events', async () => {
    const source = await boot(mockPush);

    const response = await source.push(
      post([{ name: 'page view' }, { name: 'order complete' }]),
    );

    expect(response.status).toBe(200);
    expect(mockPush).toHaveBeenCalledTimes(2);
    expect(await response.json()).toMatchObject({ processed: 2 });
  });

  it('answers 200 with processed 0 for an explicit empty batch', async () => {
    const source = await boot(mockPush);

    const response = await source.push(post({ batch: [] }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ processed: 0 });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
