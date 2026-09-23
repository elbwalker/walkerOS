import type { Collector, Elb, Trigger } from '@walkeros/core';
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

    // Source pushes via detached elb chain; yield for it.
    for (let i = 0; i < 10 && mockElb.mock.calls.length === 0; i++) {
      await Promise.resolve();
    }

    const captured = mockElb.mock.calls.map(
      (args) => ['elb', ...args] as unknown[],
    );
    expect(captured).toEqual(example.out);
  });
});

describe('createTrigger', () => {
  let instance: Trigger.Instance<UsercentricsV2Service[], void> | undefined;

  beforeEach(() => {
    // startFlow runs the real collector; the shared setup fakes timers.
    jest.useRealTimers();
    ucWindow().UC_UI = undefined;
  });

  afterEach(async () => {
    if (instance?.flow) await instance.flow.collector.command('shutdown');
    instance = undefined;
    ucWindow().UC_UI = undefined;
  });

  // `walkeros push --simulate` drives a source through its createTrigger, so
  // every step example must produce its documented consent through it.
  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
    const services: UsercentricsV2Service[] = Array.isArray(example.in)
      ? example.in
      : [];
    const mapping = example.mapping;
    const mappingSettings =
      mapping &&
      typeof mapping === 'object' &&
      'settings' in mapping &&
      mapping.settings &&
      typeof mapping.settings === 'object'
        ? mapping.settings
        : {};

    instance = await examples.createTrigger({
      sources: {
        consent: {
          code: sourceUsercentrics,
          config: { settings: { ...mappingSettings } },
        },
      },
    });
    await instance.trigger(
      example.trigger?.type,
      example.trigger?.options,
    )(services);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(instance.flow?.collector.consent).toEqual(
      example.out?.[0]?.[2] ?? {},
    );
  });
});
