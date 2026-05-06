import type { Collector, Elb } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceDataLayer } from '../index';
import { examples } from '../dev';

describe('Step Examples', () => {
  beforeEach(() => {
    (window as unknown as { dataLayer?: unknown[] }).dataLayer = undefined;
  });

  afterEach(() => {
    (window as unknown as { dataLayer?: unknown[] }).dataLayer = undefined;
  });

  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
    const mockElb = jest.fn(async () => ({
      ok: true,
      successful: [],
      failed: [],
      queued: [],
    })) as unknown as jest.MockedFunction<Elb.Fn>;

    const collectorStub: Collector.Instance = {
      allowed: true,
    } as unknown as Collector.Instance;

    const source = await sourceDataLayer({
      collector: collectorStub,
      config: { settings: {} },
      env: {
        push: mockElb as unknown as Collector.PushFn,
        command: mockElb as unknown as Collector.CommandFn,
        elb: mockElb,
        window,
        logger: createMockLogger(),
      },
      id: 'test-datalayer',
      logger: createMockLogger(),
      setIngest: async () => {},
      setRespond: jest.fn(),
    });
    // Mirror collector pass-2 init — installs the dataLayer.push interceptor.
    await source.init?.();

    // Trigger source by pushing the example input to window.dataLayer
    const win = window as Window & { dataLayer?: unknown[] };
    if (!win.dataLayer) win.dataLayer = [];
    win.dataLayer.push(example.in);

    // DataLayer interceptor pushes via tryCatch — may be detached
    for (let i = 0; i < 10 && mockElb.mock.calls.length === 0; i++) {
      await Promise.resolve();
    }

    const captured = mockElb.mock.calls.map(
      (args) => ['elb', ...args] as unknown[],
    );
    expect(captured).toEqual(example.out);
  });
});
