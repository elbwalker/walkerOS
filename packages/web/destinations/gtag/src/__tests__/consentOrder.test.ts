import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import { destinationGtag, resetConsentState } from '../index';
import type { Config, Env } from '../types';

/**
 * The real gtag destination through a real collector, asserting the exact
 * order of gtag calls. Consent Mode requires: denied default, config, then
 * the update for the recorded consent BEFORE the first event.
 */
function gtagEnv(): { calls: unknown[][]; env: Env } {
  const calls: unknown[][] = [];
  const env: Env = clone(examples.env.push);
  env.window.gtag = jest.fn((...args: unknown[]) => {
    calls.push(args);
  });
  env.window.dataLayer = [];
  return { calls, env };
}

const DEFAULT_DENIED = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
};
const UPDATE_MARKETING = {
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
};

/** The call sequence as `<command> <target>` plus the consent payload. */
function sequence(calls: unknown[][]): string[] {
  return calls.map(([command, target, payload]) =>
    command === 'consent'
      ? `consent ${String(target)} ${JSON.stringify(payload)}`
      : `${String(command)} ${String(target)}`,
  );
}

const DEFAULT = `consent default ${JSON.stringify(DEFAULT_DENIED)}`;
const UPDATE = `consent update ${JSON.stringify(UPDATE_MARKETING)}`;
const CONFIG = 'config G-X';
const PAGE_VIEW = 'event page_view';

function gtagConfig(extra: Partial<Config> = {}): Config {
  return {
    consent: { marketing: true },
    loadScript: false,
    settings: { ga4: { measurementId: 'G-X' } },
    ...extra,
  };
}

describe('gtag Consent Mode update precedes the first event', () => {
  beforeEach(() => {
    resetConsentState();
  });

  test.each([
    [
      'require + consent + event',
      { require: ['consent'] },
      true,
      [DEFAULT, CONFIG, UPDATE, PAGE_VIEW],
    ],
    [
      'require + consent, no event',
      { require: ['consent'] },
      false,
      [DEFAULT, CONFIG, UPDATE],
    ],
    ['consent + event', {}, true, [DEFAULT, CONFIG, UPDATE, PAGE_VIEW]],
    ['consent, no event', {}, false, [DEFAULT, CONFIG, UPDATE]],
  ])('runtime destination, %s', async (_name, extra, withEvent, expected) => {
    const { calls, env } = gtagEnv();
    const { elb } = await startFlow({});
    await elb('walker destination', {
      code: { ...destinationGtag, env },
      config: gtagConfig({ id: 'gtag', ...extra }),
    });
    if (withEvent) await elb('page view', {});
    await elb('walker consent', { marketing: true });
    expect(sequence(calls)).toEqual(expected);
  });

  test.each([
    ['require + consent + event', { require: ['consent'] }],
    ['consent + event', {}],
  ])('startup destination, %s', async (_name, extra) => {
    const { calls, env } = gtagEnv();
    const { elb } = await startFlow({
      destinations: {
        gtag: { code: { ...destinationGtag, env }, config: gtagConfig(extra) },
      },
    });
    await elb('page view', {});
    await elb('walker consent', { marketing: true });
    expect(sequence(calls)).toEqual([DEFAULT, CONFIG, UPDATE, PAGE_VIEW]);
  });

  test('a second grant sends a second update after the page view, never before the first', async () => {
    const { calls, env } = gtagEnv();
    const { elb } = await startFlow({});
    await elb('walker destination', {
      code: { ...destinationGtag, env },
      config: gtagConfig({ id: 'gtag', require: ['consent'] }),
    });
    await elb('page view', {});
    await elb('walker consent', { marketing: true });
    await elb('walker consent', { marketing: true });
    expect(sequence(calls)).toEqual([
      DEFAULT,
      CONFIG,
      UPDATE,
      PAGE_VIEW,
      UPDATE,
    ]);
  });

  test('no event is ever sent between the denied default and the update', async () => {
    const { calls, env } = gtagEnv();
    const { elb } = await startFlow({});
    await elb('walker destination', {
      code: { ...destinationGtag, env },
      config: gtagConfig({ id: 'gtag', require: ['consent'] }),
    });
    await elb('page view', {});
    await elb('walker consent', { marketing: true });
    const seq = sequence(calls);
    const firstEvent = seq.findIndex((s) => s.startsWith('event '));
    const update = seq.indexOf(UPDATE);
    expect(update).toBeGreaterThan(-1);
    expect(firstEvent).toBeGreaterThan(update);
  });

  test('a custom como object maps the granted key to its own parameter before the event', async () => {
    const { calls, env } = gtagEnv();
    const { elb } = await startFlow({});
    await elb('walker destination', {
      code: { ...destinationGtag, env },
      config: gtagConfig({
        id: 'gtag',
        consent: { analytics: true, marketing: true },
        require: ['consent'],
        settings: {
          como: {
            marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
            analytics: 'analytics_storage',
          },
          ga4: { measurementId: 'G-X' },
        },
      }),
    });
    await elb('page view', {});
    await elb('walker consent', { analytics: true });
    expect(sequence(calls)).toEqual([
      DEFAULT,
      CONFIG,
      'consent update {"analytics_storage":"granted"}',
      PAGE_VIEW,
    ]);
  });
});

/**
 * Order equivalence: a consent command sent before `run` and the same command
 * sent after `run` reach the vendor in the same order (denied default, config,
 * every update before the first event) and leave the same final consent
 * state. With several commands before `run` the update count may differ:
 * the run delivers one snapshot of the recorded consent, while commands after
 * `run` arrive one delta at a time.
 */
describe('gtag consent before run is equivalent to consent after run', () => {
  beforeEach(() => {
    resetConsentState();
  });

  type Consent = Record<string, boolean>;

  async function runFlow(
    consents: Consent[],
    consentFirst: boolean,
  ): Promise<string[]> {
    const { calls, env } = gtagEnv();
    const { elb, collector } = await startFlow({
      run: false,
      destinations: {
        gtag: {
          code: { ...destinationGtag, env },
          config: gtagConfig({
            consent: { analytics: true },
            settings: {
              como: {
                marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
                analytics: 'analytics_storage',
              },
              ga4: { measurementId: 'G-X' },
            },
          }),
        },
      },
    });
    if (consentFirst) {
      for (const consent of consents) await elb('walker consent', consent);
      await collector.command('run');
    } else {
      await collector.command('run');
      for (const consent of consents) await elb('walker consent', consent);
    }
    await elb('page view', {});
    return sequence(calls);
  }

  /** The final value of every Consent Mode parameter after all updates. */
  function finalConsent(seq: string[]): Record<string, string> {
    const state: Record<string, string> = {};
    for (const entry of seq) {
      const match = /^consent (default|update) (.*)$/.exec(entry);
      if (match) Object.assign(state, JSON.parse(match[2]));
    }
    return state;
  }

  /**
   * The denied default, then config, then every consent update, all before
   * the first event.
   */
  function assertOrder(seq: string[]): void {
    const firstEvent = seq.findIndex((s) => s.startsWith('event '));
    expect(firstEvent).toBeGreaterThan(-1);
    expect(seq.slice(0, 2)).toEqual([DEFAULT, CONFIG]);
    const updates = seq
      .map((s, i) => (s.startsWith('consent update ') ? i : -1))
      .filter((i) => i !== -1);
    expect(updates.length).toBeGreaterThan(0);
    for (const i of updates) expect(i).toBeLessThan(firstEvent);
  }

  test('one consent command produces the identical gtag call sequence on both paths', async () => {
    const consents: Consent[] = [{ analytics: true }];
    const before = await runFlow(consents, true);
    resetConsentState();
    const after = await runFlow(consents, false);
    expect(before).toEqual(after);
    expect(before).toEqual([
      `consent default ${JSON.stringify(DEFAULT_DENIED)}`,
      CONFIG,
      'consent update {"analytics_storage":"granted"}',
      PAGE_VIEW,
    ]);
  });

  test('two consent commands produce the same order and the same final consent state on both paths', async () => {
    const consents: Consent[] = [{ analytics: true }, { marketing: true }];
    const before = await runFlow(consents, true);
    resetConsentState();
    const after = await runFlow(consents, false);
    assertOrder(before);
    assertOrder(after);
    expect(finalConsent(before)).toEqual(finalConsent(after));
    expect(finalConsent(after)).toEqual({
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted',
    });
  });
});
