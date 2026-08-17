import type { Collector } from '@walkeros/core';
import { sourceFetch } from '../index';
import { examples } from '../dev';
import type { Content } from '../examples/trigger';

describe('Step Examples', () => {
  let instance: Awaited<ReturnType<typeof examples.createTrigger>> | undefined;

  afterEach(async () => {
    if (instance?.flow) await instance.flow.collector.command('shutdown');
    instance = undefined;
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const content = example.in as Content;

    const mockPush: jest.Mock = jest.fn(
      async () => ({ ok: true }) as Awaited<ReturnType<Collector.PushFn>>,
    );

    instance = await examples.createTrigger({
      consent: { functional: true },
      sources: {
        fetch: {
          code: sourceFetch,
          config: { settings: {} },
          // Boundary capture: the recorded artifact is the raw event this
          // source hands the collector, so the pipeline must not run.
          terminus: mockPush as unknown as Collector.PushFn,
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
