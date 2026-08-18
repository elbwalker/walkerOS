import type { Collector } from '@walkeros/core';
import { sourceLambda } from '../index';
import { examples } from '../../dev';
import type { Content } from '../examples/trigger';

describe('Step Examples', () => {
  let shutdown: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (shutdown) await shutdown();
    shutdown = undefined;
  });

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

    const instance = await examples.createTrigger({
      consent: { functional: true },
      sources: {
        lambda: {
          code: sourceLambda,
          config: { settings: { enablePixelTracking: true } },
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

    expect(result.statusCode).toBe(200);

    const captured = mockPush.mock.calls.map(
      (args) => ['elb', ...args.map(stripUndefined)] as unknown[],
    );

    expect(captured).toEqual(example.out);
  });
});
