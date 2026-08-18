import type { Collector } from '@walkeros/core';
import { sourceExpress } from '../index';
import { examples } from '../dev';
import type { Content } from '../examples/trigger';

describe('Step Examples', () => {
  let shutdown: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (shutdown) await shutdown();
    shutdown = undefined;
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const content = example.in as Content;

    const mockPush: jest.Mock = jest.fn(
      async () => ({ ok: true }) as Awaited<ReturnType<Collector.PushFn>>,
    );

    const instance = await examples.createTrigger({
      consent: { functional: true },
      sources: {
        express: {
          code: sourceExpress,
          config: { settings: { port: 0 } },
          // Boundary capture: the recorded artifact is the raw event this
          // source hands the collector, so the pipeline must not run.
          terminus: mockPush as unknown as Collector.PushFn,
        },
      },
    });

    shutdown = async () => {
      if (instance.flow) await instance.flow.collector.command('shutdown');
    };

    const result = await instance.trigger()(content);

    expect(result.status).toBe(200);

    const captured = mockPush.mock.calls.map(
      (args) => ['elb', ...args] as unknown[],
    );

    expect(captured).toEqual(example.out);
  });
});
