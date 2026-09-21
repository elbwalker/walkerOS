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
    // A source step example's `mapping` is the source config fragment the
    // docs render next to it, so only `mapping.settings` reaches the source.
    const mapping = example.mapping;
    const mappingSettings =
      mapping &&
      typeof mapping === 'object' &&
      'settings' in mapping &&
      mapping.settings &&
      typeof mapping.settings === 'object'
        ? mapping.settings
        : {};

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

    const source = await sourceCookiePro({
      collector: collectorStub,
      config: {
        settings: { ...mappingSettings },
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
      withScope: async (_r, _resp, body) => body({} as never),
    });

    // Adapter setup (listeners + OptanonWrapper + static read) runs in init().
    await source.init?.();

    // Source pushes via detached elb chain; yield for it
    for (let i = 0; i < 10 && mockElb.mock.calls.length === 0; i++) {
      await Promise.resolve();
    }

    const captured = mockElb.mock.calls.map(
      (args) => ['elb', ...args] as unknown[],
    );
    expect(captured).toEqual(example.out);
  });
});
