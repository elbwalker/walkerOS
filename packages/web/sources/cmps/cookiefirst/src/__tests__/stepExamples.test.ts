import type { Collector, Elb, Source, Trigger } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceCookieFirst } from '../index';
import { examples } from '../dev';
import type { CookieFirstConsent, Types } from '../types';

describe('Step Examples', () => {
  beforeEach(() => {
    (window as unknown as Record<string, unknown>).CookieFirst = undefined;
  });

  afterEach(() => {
    (window as unknown as Record<string, unknown>).CookieFirst = undefined;
  });

  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
    const content = example.in as Record<string, boolean>;
    const mapping = example.mapping as
      | { settings?: Record<string, unknown> }
      | undefined;

    const mockElb = jest.fn(async () => ({
      ok: true,
      successful: [],
      failed: [],
      queued: [],
    })) as unknown as jest.MockedFunction<Elb.Fn>;

    const collectorStub: Collector.Instance = {
      allowed: true,
    } as unknown as Collector.Instance;

    // Pre-init: set CookieFirst global so source reads it during init
    (window as unknown as Record<string, unknown>).CookieFirst = {
      consent: content,
    };

    const source = await sourceCookieFirst({
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
      id: 'test-cookiefirst',
      logger: createMockLogger(),
      withScope: async (_r, _resp, body) => body({} as never),
    });

    // Adapter setup runs in init(); the static read of window.CookieFirst.consent
    // happens there (no need to dispatch cf_init again).
    await source.init?.();

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

/** The example's CookieFirst categories, typed. */
function consentOf(input: unknown): CookieFirstConsent {
  const content: CookieFirstConsent = {};
  if (input && typeof input === 'object')
    for (const [key, value] of Object.entries(input))
      if (typeof value === 'boolean') content[key] = value;
  return content;
}

/** The CookieFirst source, recording every elb call it makes. */
function recordingSource(calls: unknown[][]): Source.Init<Types> {
  return (context) =>
    sourceCookieFirst({
      ...context,
      env: {
        ...context.env,
        elb: new Proxy(context.env.elb, {
          apply(target, thisArg, args: unknown[]) {
            calls.push(['elb', ...args]);
            return Reflect.apply(target, thisArg, args);
          },
        }),
      },
    });
}

/** A fixed number of microtask turns, so a late extra call is seen too. */
async function settle(): Promise<void> {
  for (let i = 0; i < 50; i++) await Promise.resolve();
}

describe('createTrigger', () => {
  let instance: Trigger.Instance<CookieFirstConsent, void> | undefined;

  beforeEach(() => {
    // startFlow runs the real collector; the shared setup fakes timers.
    jest.useRealTimers();
    window.CookieFirst = undefined;
  });

  afterEach(async () => {
    if (instance?.flow) await instance.flow.collector.command('shutdown');
    instance = undefined;
    window.CookieFirst = undefined;
  });

  // `walkeros push --simulate` drives a source through its createTrigger, so
  // the trigger must reproduce each example out exactly: the call list, since
  // the collector's consent state cannot show a repeated command.
  it.each(Object.entries(examples.step))(
    'the trigger reproduces the %s out exactly',
    async (_name, example) => {
      const content = consentOf(example.in);
      const mapping = example.mapping;
      const mappingSettings =
        mapping &&
        typeof mapping === 'object' &&
        'settings' in mapping &&
        mapping.settings &&
        typeof mapping.settings === 'object'
          ? mapping.settings
          : {};

      const calls: unknown[][] = [];
      instance = await examples.createTrigger({
        sources: {
          consent: {
            code: recordingSource(calls),
            config: { settings: { ...mappingSettings } },
          },
        },
      });
      await instance.trigger(
        example.trigger?.type,
        example.trigger?.options,
      )(content);
      await settle();

      expect(calls).toEqual(example.out);
    },
  );

  it('a later call is a decision on the loaded page: one more consent', async () => {
    const calls: unknown[][] = [];
    instance = await examples.createTrigger({
      sources: { consent: { code: recordingSource(calls) } },
    });
    const run = instance.trigger('consent');

    await run(consentOf(examples.step.fullConsent.in));
    await settle();
    await run(consentOf(examples.step.partialConsent.in));
    await settle();

    expect(calls).toEqual([
      ...(examples.step.fullConsent.out ?? []),
      ...(examples.step.partialConsent.out ?? []),
    ]);
  });
});
