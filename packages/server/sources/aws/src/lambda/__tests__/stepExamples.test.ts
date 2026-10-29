import { isObject } from '@walkeros/core';
import type { Collector, Destination, WalkerOS } from '@walkeros/core';
import { sourceLambda } from '../index';
import { examples } from '../../dev';
import type { Content } from '../examples/trigger';

const isContent = (value: unknown): value is Content => isObject(value);

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
    const content = example.in;
    if (!isContent(content)) throw new Error(`${name}: in is not a request`);

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
          lambda: {
            code: sourceLambda,
            config: { settings: { enablePixelTracking: true } },
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
        instance.flow?.collector.status.sources.lambda?.rejected ?? 0,
      ).toBe(0);
    },
  );
});
