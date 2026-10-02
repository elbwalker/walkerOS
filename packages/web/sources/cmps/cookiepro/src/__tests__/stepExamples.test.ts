import type { Elb } from '@walkeros/core';
import { createIngest, createMockLogger } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { sourceCookiePro } from '../index';
import { examples } from '../dev';
import type { Types } from '../types';

describe('Step Examples', () => {
  beforeEach(() => {
    window.OptanonActiveGroups = undefined;
    window.OneTrust = undefined;
    window.Optanon = undefined;
    window.OptanonWrapper = undefined;
  });

  afterEach(() => {
    window.OptanonActiveGroups = undefined;
    window.OneTrust = undefined;
    window.Optanon = undefined;
    window.OptanonWrapper = undefined;
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

    const mockElb: jest.MockedFunction<Elb.Fn> = jest
      .fn()
      .mockImplementation(async () => ({
        ok: true,
        successful: [],
        failed: [],
        queued: [],
      }));

    // The source never reads its collector; a real one stands in for the stub.
    const { collector } = await startFlow({ run: false });

    // Pre-init: seed OneTrust globals so "already loaded" path fires
    if (typeof example.in !== 'string') {
      throw new Error(
        'A CookiePro step example in is the active groups string',
      );
    }
    window.OptanonActiveGroups = example.in;
    window.OneTrust = { IsAlertBoxClosed: () => true };

    const env: Types['env'] = {
      push: mockElb,
      command: mockElb,
      elb: mockElb,
      window,
      logger: createMockLogger(),
    };

    const source = await sourceCookiePro({
      collector,
      config: {
        settings: { ...mappingSettings },
      },
      env,
      id: 'test-cookiepro',
      logger: createMockLogger(),
      withScope: async (_r, respond, body) =>
        body({
          ...env,
          ingest: createIngest('test-cookiepro'),
          respond,
        }),
    });

    // Adapter setup (listeners + OptanonWrapper + static read) runs in init().
    await source.init?.();

    // Source pushes via detached elb chain; yield for it
    for (let i = 0; i < 10 && mockElb.mock.calls.length === 0; i++) {
      await Promise.resolve();
    }

    const captured = mockElb.mock.calls.map((args) => ['elb', ...args]);
    expect(captured).toEqual(example.out);
  });
});

describe('legacy trigger', () => {
  it('ignores a non-window env', () => {
    const env: Record<string, unknown> = { window: {} };
    examples.trigger(',C0001,', env);
    expect(env.window).toEqual({});
  });
});
