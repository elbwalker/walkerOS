import type { Collector, Elb } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceCookiePro } from '../index';
import { examples } from '../dev';

describe('Step Examples', () => {
  beforeEach(() => {
    const win = window as unknown as Record<string, unknown>;
    win.OptanonActiveGroups = undefined;
    win.OneTrust = undefined;
    win.Optanon = undefined;
    win.OptanonWrapper = undefined;
  });

  afterEach(() => {
    const win = window as unknown as Record<string, unknown>;
    win.OptanonActiveGroups = undefined;
    win.OneTrust = undefined;
    win.Optanon = undefined;
    win.OptanonWrapper = undefined;
  });

  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
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

    // Pre-init: seed OneTrust globals so "already loaded" path fires
    const win = window as unknown as Record<string, unknown>;
    win.OptanonActiveGroups = example.in as string;
    win.OneTrust = { IsAlertBoxClosed: () => true };

    await sourceCookiePro({
      collector: collectorStub,
      config: {
        settings: {
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
      id: 'test-cookiepro',
      logger: createMockLogger(),
      setIngest: async () => {},
      setRespond: jest.fn(),
    });

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
