import { sourceCloudFunction } from '../index';
import type { Request, Response, Types } from '../types';
import type { Source, Collector } from '@walkeros/core';
import { createIngest, createMockLogger } from '@walkeros/core';

// The shared envelope contract, same behavior list as the other three sources.

function createSourceContext(
  config: Partial<Source.Config<Types>> = {},
  env: Partial<Types['env']> = {},
): Source.Context<Types> {
  const baseEnv = env as Types['env'];
  return {
    config,
    env: baseEnv,
    logger: env.logger || createMockLogger(),
    id: 'test-gcp',
    collector: {} as Collector.Instance,
    withScope: async (_raw, respond, body) =>
      body({
        ...baseEnv,
        push: baseEnv.push,
        ingest: createIngest('test-gcp'),
        respond,
      }),
  };
}

const createMockRequest = (body?: unknown, method = 'POST'): Request =>
  ({
    method,
    body,
    headers: {},
    get: () => undefined,
  }) as Request;

interface CapturingResponse extends Response {
  statusCode: number;
  payload: unknown;
}

function createMockResponse(): CapturingResponse {
  const res: CapturingResponse = {
    statusCode: 200,
    payload: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(value: unknown) {
      res.payload = value;
      return res;
    },
    send() {
      return res;
    },
    set() {
      return res;
    },
  };
  return res;
}

describe('gcp envelope', () => {
  let mockPush: jest.MockedFunction<(...args: unknown[]) => unknown>;

  const boot = (config: Partial<Source.Config<Types>> = {}) =>
    sourceCloudFunction(
      createSourceContext(config, {
        push: mockPush as never,
        command: jest.fn() as never,
        elb: jest.fn() as never,
        logger: createMockLogger(),
      }),
    );

  beforeEach(() => {
    mockPush = jest
      .fn()
      .mockResolvedValue({ event: { id: 'test-id' }, ok: true });
  });

  it('accepts a batch envelope as N events', async () => {
    const source = await boot();
    const res = createMockResponse();

    await source.push(
      createMockRequest({ batch: [{ name: 'a' }, { name: 'b' }] }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(mockPush).toHaveBeenCalledTimes(2);
  });

  it('accepts a bare array as N events', async () => {
    const source = await boot();
    const res = createMockResponse();

    await source.push(createMockRequest([{ name: 'a' }, { name: 'b' }]), res);

    expect(res.statusCode).toBe(200);
    expect(mockPush).toHaveBeenCalledTimes(2);
  });

  it('still accepts a single event', async () => {
    const source = await boot();
    const res = createMockResponse();

    await source.push(createMockRequest({ name: 'page view' }), res);

    expect(res.statusCode).toBe(200);
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('rejects an over-cap batch with 400 and pushes nothing', async () => {
    const source = await boot({ settings: { maxBatchSize: 2 } });
    const res = createMockResponse();

    await source.push(
      createMockRequest({
        batch: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
      }),
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('answers 207 with per-index errors on partial failure', async () => {
    mockPush = jest
      .fn()
      .mockResolvedValueOnce({ event: { id: 'a' }, ok: true })
      .mockResolvedValueOnce({
        ok: false,
        invalid: true,
        error: 'Invalid event',
      });
    const source = await boot();
    const res = createMockResponse();

    await source.push(
      createMockRequest({ batch: [{ name: 'a' }, { name: 'b' }] }),
      res,
    );

    expect(res.statusCode).toBe(207);
    expect(res.payload).toMatchObject({
      success: false,
      processed: 1,
      failed: 1,
      errors: [{ index: 1 }],
    });
  });

  it('keeps the batch response shape for a single-element batch', async () => {
    const source = await boot();
    const res = createMockResponse();

    await source.push(createMockRequest({ batch: [{ name: 'a' }] }), res);

    expect(res.payload).toHaveProperty('processed', 1);
    expect(res.payload).not.toHaveProperty('id');
  });
});
