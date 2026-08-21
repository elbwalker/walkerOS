import { sourceLambda } from '../index';
import type { LambdaContext, LambdaEvent, Types } from '../types';
import type { Source, Collector } from '@walkeros/core';
import { createIngest, createMockLogger } from '@walkeros/core';
import { createMockEventV1, createMockEventV2 } from './fixtures';

// The shared envelope contract, same behavior list as the other three sources,
// run across both API Gateway versions so the matrix proves they converge.

function createSourceContext(
  config: Partial<Source.Config<Types>> = {},
  env: Partial<Types['env']> = {},
): Source.Context<Types> {
  const baseEnv = env as Types['env'];
  return {
    config,
    env: baseEnv,
    logger: env.logger || createMockLogger(),
    id: 'test-lambda',
    collector: {} as Collector.Instance,
    withScope: async (_raw, respond, body) =>
      body({
        ...baseEnv,
        push: baseEnv.push,
        ingest: createIngest('test-lambda'),
        respond,
      }),
  };
}

const createMockContext = (): LambdaContext =>
  ({
    awsRequestId: 'request-id',
    functionName: 'test',
  }) as LambdaContext;

const bodies = (payload: unknown) => {
  const text = JSON.stringify(payload);
  return [
    ['v1', createMockEventV1('POST', text)],
    ['v2', createMockEventV2('POST', text)],
  ] as Array<[string, LambdaEvent]>;
};

describe('aws envelope', () => {
  let mockPush: jest.MockedFunction<(...args: unknown[]) => unknown>;

  const boot = (config: Partial<Source.Config<Types>> = {}) =>
    sourceLambda(
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

  it.each(
    bodies({ batch: [{ name: 'page view' }, { name: 'order complete' }] }),
  )('%s accepts a batch envelope as N events', async (_, event) => {
    const source = await boot();

    const result = await source.push(event, createMockContext());

    expect(result.statusCode).toBe(200);
    expect(mockPush).toHaveBeenCalledTimes(2);
  });

  it.each(bodies([{ name: 'page view' }, { name: 'order complete' }]))(
    '%s accepts a bare array as N events',
    async (_, event) => {
      const source = await boot();

      const result = await source.push(event, createMockContext());

      expect(result.statusCode).toBe(200);
      expect(mockPush).toHaveBeenCalledTimes(2);
    },
  );

  it.each(bodies({ name: 'page view' }))(
    '%s still accepts a single event',
    async (_, event) => {
      const source = await boot();

      const result = await source.push(event, createMockContext());

      expect(result.statusCode).toBe(200);
      expect(mockPush).toHaveBeenCalledTimes(1);
    },
  );

  it('rejects an over-cap batch with 400 and pushes nothing', async () => {
    const source = await boot({ settings: { maxBatchSize: 2 } });
    const event = createMockEventV1(
      'POST',
      JSON.stringify({
        batch: [
          { name: 'page view' },
          { name: 'order complete' },
          { name: 'product view' },
        ],
      }),
    );

    const result = await source.push(event, createMockContext());

    expect(result.statusCode).toBe(400);
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
    const event = createMockEventV1(
      'POST',
      JSON.stringify({
        batch: [{ name: 'page view' }, { name: 'order complete' }],
      }),
    );

    const result = await source.push(event, createMockContext());

    expect(result.statusCode).toBe(207);
    expect(JSON.parse(result.body)).toMatchObject({
      success: false,
      processed: 1,
      failed: 1,
      errors: [{ index: 1 }],
    });
  });

  it('keeps the batch response shape for a single-element batch', async () => {
    const source = await boot();
    const event = createMockEventV1(
      'POST',
      JSON.stringify({ batch: [{ name: 'page view' }] }),
    );

    const result = await source.push(event, createMockContext());

    const payload = JSON.parse(result.body);
    expect(payload).toHaveProperty('processed', 1);
    expect(payload).not.toHaveProperty('id');
  });
});
