import type { Collector, Elb, Logger } from '@walkeros/core';
import { sourceLambda } from '../index';
import { examples } from '../../dev';
import type { Content } from '../examples/trigger';

describe('Step Examples', () => {
  let shutdown: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (shutdown) await shutdown();
    shutdown = undefined;
  });

  const noopFn = () => {};
  const noopLogger: Logger.Instance = {
    error: noopFn,
    warn: noopFn,
    info: noopFn,
    debug: noopFn,
    throw: (message: string | Error) => {
      throw typeof message === 'string' ? new Error(message) : message;
    },
    json: noopFn,
    scope: () => noopLogger,
  };

  const stripUndefined = (value: unknown): unknown => {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(stripUndefined);
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) result[k] = stripUndefined(v);
    }
    return result;
  };

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const content = example.in as Content;

    const mockPush: jest.Mock = jest.fn(
      async () => ({ ok: true }) as Awaited<ReturnType<Collector.PushFn>>,
    );
    const mockCommand: jest.Mock = jest.fn(
      async () => ({ ok: true }) as Awaited<ReturnType<Elb.Fn>>,
    );
    const mockElb: jest.Mock = jest.fn(
      async () => ({ ok: true }) as Awaited<ReturnType<Elb.Fn>>,
    );

    const instance = await examples.createTrigger({
      consent: { functional: true },
      sources: {
        lambda: {
          code: sourceLambda,
          config: { settings: { enablePixelTracking: true } },
          env: {
            push: mockPush as unknown as Collector.PushFn,
            command: mockCommand as unknown as Collector.CommandFn,
            elb: mockElb as unknown as Elb.Fn,
            logger: noopLogger,
          },
        },
      },
    });

    shutdown = async () => {
      if (instance.flow) await instance.flow.collector.command('shutdown');
    };

    const result = await instance.trigger()(content);

    expect(result.statusCode).toBe(200);

    const captured = mockPush.mock.calls.map(
      (args) => ['elb', ...args.map(stripUndefined)] as unknown[],
    );

    expect(captured).toEqual(example.out);
  });
});
