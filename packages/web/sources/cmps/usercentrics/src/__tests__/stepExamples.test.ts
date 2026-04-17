import type { Collector, Elb } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceUsercentrics } from '../index';
import { examples } from '../dev';

describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
    const content = example.in as Record<string, unknown>;
    const mapping = example.mapping as Record<string, unknown> | undefined;

    const mockElb = jest.fn(async () => ({
      ok: true,
      successful: [],
      failed: [],
      queued: [],
    })) as unknown as jest.MockedFunction<Elb.Fn>;

    const collectorStub: Collector.Instance = {
      allowed: true,
    } as unknown as Collector.Instance;

    await sourceUsercentrics({
      collector: collectorStub,
      config: {
        settings: {
          ...(mapping?.eventName
            ? { eventName: mapping.eventName as string }
            : {}),
          ...(mapping?.categoryMap
            ? { categoryMap: mapping.categoryMap as Record<string, string> }
            : {}),
        },
      },
      env: {
        push: mockElb as unknown as Collector.PushFn,
        command: mockElb as unknown as Collector.CommandFn,
        elb: mockElb,
        window,
        logger: createMockLogger(),
      },
      id: 'test-usercentrics',
      logger: createMockLogger(),
      setIngest: async () => {},
      setRespond: jest.fn(),
    });

    // Dispatch CMP event — source listener catches it
    const eventName = (mapping?.eventName as string) || 'ucEvent';
    window.dispatchEvent(new CustomEvent(eventName, { detail: content }));

    // Source pushes via detached elb chain — yield for it
    for (let i = 0; i < 10 && mockElb.mock.calls.length === 0; i++) {
      await Promise.resolve();
    }

    const captured = mockElb.mock.calls.map(
      (args) => ['elb', ...args] as unknown[],
    );
    expect(captured).toEqual(example.out);
  });
});
