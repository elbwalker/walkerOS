import { isObject } from '@walkeros/core';
import type { Collector, Destination, WalkerOS } from '@walkeros/core';
import { sourceExpress } from '../index';
import { examples } from '../dev';
import type { Content } from '../examples/trigger';

const isContent = (value: unknown): value is Content =>
  isObject(value) &&
  typeof value.method === 'string' &&
  typeof value.path === 'string';

describe('Step Examples', () => {
  let shutdown: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (shutdown) await shutdown();
    shutdown = undefined;
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const content = example.in;
    if (!isContent(content)) throw new Error(`${name}: in is not a request`);

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

  // The published example must also work on a real pipeline: every event it
  // hands the collector reaches a destination, and none is rejected. The
  // delivered event carries more than the source handed over (id, timestamp,
  // source.count), so the comparison is on what the example states.
  const nameAndData = (event: unknown): unknown =>
    isObject(event) ? { name: event.name, data: event.data } : event;

  it.each(Object.entries(examples.step))(
    '%s reaches a destination on a real collector',
    async (name, example) => {
      const content = example.in;
      if (!isContent(content)) throw new Error(`${name}: in is not a request`);
      const delivered: WalkerOS.Event[] = [];
      const capture: Destination.Instance = {
        type: 'capture',
        config: {},
        push: (event) => {
          delivered.push(event);
        },
      };

      const instance = await examples.createTrigger({
        logger: { handler: () => undefined },
        sources: {
          express: {
            code: sourceExpress,
            config: { settings: { port: 0 }, async: false },
          },
        },
        destinations: { capture: { code: capture } },
      });

      shutdown = async () => {
        if (instance.flow) await instance.flow.collector.command('shutdown');
      };

      await instance.trigger()(content);

      expect(delivered.map(nameAndData)).toEqual(
        (example.out ?? []).map(([, event]) => nameAndData(event)),
      );
      expect(
        instance.flow?.collector.status.sources.express?.rejected ?? 0,
      ).toBe(0);
    },
  );
});
