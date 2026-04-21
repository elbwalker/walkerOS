import type { Collector, Elb, Logger } from '@walkeros/core';
import { sourceFetch } from '../index';
import { examples } from '../dev';
import type { Content } from '../examples/trigger';

describe('Step Examples', () => {
  let instance: Awaited<ReturnType<typeof examples.createTrigger>> | undefined;

  afterEach(async () => {
    if (instance?.flow) await instance.flow.collector.command('shutdown');
    instance = undefined;
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

    instance = await examples.createTrigger({
      consent: { functional: true },
      sources: {
        fetch: {
          code: sourceFetch,
          config: { settings: {} },
          env: {
            push: mockPush as unknown as Collector.PushFn,
            command: mockCommand as unknown as Collector.CommandFn,
            elb: mockElb as unknown as Elb.Fn,
            logger: noopLogger,
          },
        },
      },
    });

    const result = await instance.trigger()(content);

    expect(result.status).toBe(200);

    const captured = mockPush.mock.calls.map(
      (args) => ['elb', ...args] as unknown[],
    );

    expect(captured).toEqual(example.out);
  });
});
