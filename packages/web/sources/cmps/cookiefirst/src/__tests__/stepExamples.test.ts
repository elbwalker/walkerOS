import type { Elb, Source, Trigger } from '@walkeros/core';
import { createIngest, createMockLogger } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { sourceCookieFirst } from '../index';
import { examples } from '../dev';
import type { CookieFirstConsent, Types } from '../types';

describe('Step Examples', () => {
  beforeEach(() => {
    window.CookieFirst = undefined;
  });

  afterEach(() => {
    window.CookieFirst = undefined;
  });

  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
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

    // Pre-init: set CookieFirst global so source reads it during init
    window.CookieFirst = {
      consent: content,
    };

    const env: Types['env'] = {
      push: mockElb,
      command: mockElb,
      elb: mockElb,
      window,
      logger: createMockLogger(),
    };

    const source = await sourceCookieFirst({
      collector,
      config: {
        settings: {
          ...mappingSettings,
        },
      },
      env,
      id: 'test-cookiefirst',
      logger: createMockLogger(),
      withScope: async (_r, respond, body) =>
        body({
          ...env,
          ingest: createIngest('test-cookiefirst'),
          respond,
        }),
    });

    // Adapter setup runs in init(); the static read of window.CookieFirst.consent
    // happens there (no need to dispatch cf_init again).
    await source.init?.();

    // Source pushes via detached elb chain — yield for it
    for (let i = 0; i < 10 && mockElb.mock.calls.length === 0; i++) {
      await Promise.resolve();
    }

    const captured = mockElb.mock.calls.map((args) => ['elb', ...args]);
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

describe('legacy trigger', () => {
  it('sets the consent on the package mock window', () => {
    const win = examples.createMockWindow();
    examples.trigger({ necessary: true }, { window: win });
    expect(win.CookieFirst).toEqual({ consent: { necessary: true } });
  });

  afterEach(() => {
    window.CookieFirst = undefined;
  });

  it('sets the consent on the window', () => {
    examples.trigger({ necessary: true }, { window });
    expect(window.CookieFirst).toEqual({ consent: { necessary: true } });
  });

  it('ignores a non-window env', () => {
    const env: Record<string, unknown> = { window: { CookieFirst: undefined } };
    examples.trigger({ necessary: true }, env);
    expect(env.window).toEqual({ CookieFirst: undefined });
  });
});
