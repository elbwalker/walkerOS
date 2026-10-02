import type { Elb } from '@walkeros/core';
import { createIngest, createMockLogger } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { sourceDataLayer } from '../index';
import { examples } from '../dev';
import type { Types } from '../types';

describe('Step Examples', () => {
  beforeEach(() => {
    window.dataLayer = undefined;
  });

  afterEach(() => {
    window.dataLayer = undefined;
  });

  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
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

    const env: Types['env'] = {
      push: mockElb,
      command: mockElb,
      elb: mockElb,
      window,
      logger: createMockLogger(),
    };

    const source = await sourceDataLayer({
      collector,
      config: { settings: {} },
      env,
      id: 'test-datalayer',
      logger: createMockLogger(),
      withScope: async (_r, respond, body) =>
        body({
          ...env,
          ingest: createIngest('test-datalayer'),
          respond,
        }),
    });
    // Mirror collector pass-2 init — installs the dataLayer.push interceptor.
    await source.init?.();

    // Trigger source by pushing the example input to window.dataLayer
    if (!window.dataLayer) window.dataLayer = [];
    window.dataLayer.push(example.in);

    // DataLayer interceptor pushes via tryCatch — may be detached
    for (let i = 0; i < 10 && mockElb.mock.calls.length === 0; i++) {
      await Promise.resolve();
    }

    const captured = mockElb.mock.calls.map((args) => ['elb', ...args]);
    expect(captured).toEqual(example.out);
  });
});

describe('legacy trigger', () => {
  it('pushes to the package mock window', () => {
    const win = examples.env.push.window;
    examples.trigger({ event: 'purchase' }, { window: win });
    expect(win?.dataLayer).toEqual([{ event: 'purchase' }]);
  });

  it('ignores a non-window env', () => {
    const env: Record<string, unknown> = { window: {} };
    examples.trigger({ event: 'purchase' }, env);
    expect(env.window).toEqual({});
  });
});
