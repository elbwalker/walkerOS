import type { Collector, Elb } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceUsercentrics } from '../index';
import { examples } from '../dev';
import type { UsercentricsV2Api, UsercentricsV2Service } from '../types';

/** Typed access to the `UC_UI` global on the jsdom window. */
interface UcWindow {
  UC_UI?: UsercentricsV2Api;
}

function ucWindow(): UcWindow {
  return window as unknown as UcWindow;
}

describe('Step Examples', () => {
  beforeEach(() => {
    ucWindow().UC_UI = undefined;
  });

  afterEach(() => {
    ucWindow().UC_UI = undefined;
  });

  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
    const services = example.in as UsercentricsV2Service[];
    const mapping = example.mapping as
      | { settings?: Record<string, unknown> }
      | undefined;
    const dispatch =
      (example.trigger?.options as { dispatch?: string } | undefined)
        ?.dispatch ?? 'init';

    const mockElb = jest.fn(async () => ({
      ok: true,
      successful: [],
      failed: [],
      queued: [],
    })) as unknown as jest.MockedFunction<Elb.Fn>;

    const collectorStub: Collector.Instance = {
      allowed: true,
    } as unknown as Collector.Instance;

    const ucUi: UsercentricsV2Api = {
      isInitialized: () => true,
      getServicesBaseInfo: () => services,
    };

    // 'init': UC_UI is present when the source runs, so the static read at
    // init emits the snapshot. 'cmp': attach UC_UI only after init so the
    // static read is a no-op, then drive the consent-change path.
    if (dispatch === 'init') ucWindow().UC_UI = ucUi;

    const source = await sourceUsercentrics({
      collector: collectorStub,
      config: {
        settings: {
          ...(mapping?.settings || {}),
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
      withScope: async (_r, _resp, body) => body({} as never),
    });

    // Adapter setup (listener attach + static read) happens in init().
    await source.init?.();

    if (dispatch === 'cmp') {
      ucWindow().UC_UI = ucUi;
      window.dispatchEvent(
        new CustomEvent('UC_UI_CMP_EVENT', {
          detail: { source: 'button', type: 'ACCEPT_ALL' },
        }),
      );
    }

    // Source pushes via detached elb chain — yield for it.
    for (let i = 0; i < 10 && mockElb.mock.calls.length === 0; i++) {
      await Promise.resolve();
    }

    const captured = mockElb.mock.calls.map(
      (args) => ['elb', ...args] as unknown[],
    );
    expect(captured).toEqual(example.out);
  });
});
