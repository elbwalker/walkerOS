import { startFlow } from '@walkeros/collector';
import { sourceBrowser } from '../index';
import type { Collector } from '@walkeros/core';

/**
 * Race condition between user-issued `walker consent` and the browser
 * source's elbLayer queue replay.
 *
 * Setup mirrors a real page load:
 *   1. The page (or bundle) pushes a stale `walker consent` to window.elbLayer
 *      before the browser source initialises.
 *   2. The browser source has `require: ['consent']`, so it sits in
 *      collector.pending.sources.browser until a consent event arrives.
 *   3. Code on the page later calls `elb('walker consent', {...})` with
 *      a fresh state (e.g. user clicked accept).
 *
 * Expected:
 *   collector.consent reflects the freshest call.
 *
 * Actual:
 *   Activating the browser source replays the stale queued entry AFTER the
 *   fresh consent has already been applied, overwriting it.
 */

const elbLayerKey = 'elbLayer';

const setQueue = (items: unknown[][]): void => {
  (window as unknown as Record<string, unknown>)[elbLayerKey] = items;
};

const clearQueue = (): void => {
  (window as unknown as Record<string, unknown>)[elbLayerKey] = undefined;
};

describe('elbLayer queue replay vs. fresh walker consent', () => {
  beforeEach(() => {
    clearQueue();
  });

  afterEach(() => {
    clearQueue();
  });

  test('fresh consent is clobbered by stale queued walker consent on activation', async () => {
    // Stale state queued before the source initialised.
    setQueue([['walker consent', { marketing: false }]]);

    const { collector, elb } = await startFlow({
      logger: { level: 'DEBUG' },
      sources: {
        browser: {
          code: sourceBrowser,
          config: {
            require: ['consent'],
            settings: {
              pageview: false,
              elb: false,
              prefix: 'data-elb',
            },
          },
        },
      },
    });

    // Browser source is registered. Note: the stale `walker consent` queued
    // above is drained during the source's `init` and decrements the source's
    // require gate, so by the time control returns here the source is already
    // "started". The race we're verifying is purely about the value of
    // collector.consent.marketing after the user's fresh grant.
    expect(collector.sources.browser).toBeDefined();

    // User clicks accept → fresh grant.
    await elb('walker consent', { marketing: true });

    // What we want: the freshest call wins.
    // What actually happens: the queued stale {marketing:false} is replayed
    // AFTER the fresh grant by initElbLayer → consent.marketing === false.
    expect(collector.consent.marketing).toBe(true);
  });

  test('pageview fires after source activates via require:[consent]', async () => {
    // No queue manipulation here. We're isolating the second concern:
    // a source gated by require:['consent'] is registered AFTER `walker run`
    // fires inside startFlow. We expect the activation path to still produce
    // the pageview that pageview:true promises.
    const collected: string[] = [];

    const { collector, elb } = await startFlow({
      sources: {
        browser: {
          code: sourceBrowser,
          config: {
            require: ['consent'],
            settings: {
              pageview: true,
              elb: false,
              prefix: 'data-elb',
            },
          },
        },
      },
    });

    // Capture every event the collector pushes after activation.
    const realPush = collector.push;
    collector.push = (async (event: unknown, options?: unknown) => {
      const e = event as { name?: string };
      if (e?.name) collected.push(e.name);
      return realPush(event as never, options as never);
    }) as Collector.Instance['push'];

    // Browser source is registered with require: ['consent'] still pending.
    expect(collector.sources.browser).toBeDefined();
    expect(collector.sources.browser.config.require).toContain('consent');

    await elb('walker consent', { marketing: true });

    // Source is now started (require empty after consent fires).
    expect(collector.sources.browser).toBeDefined();
    expect(collector.sources.browser.config.require?.length || 0).toBe(0);
    // ...but pageview never fired, because `walker run` already happened
    // in startFlow before this source existed in collector.sources, so the
    // source's on('run') handler was never invoked.
    expect(collected).toContain('page view');
  });

  test('without queued walker consent, fresh grant is preserved (control)', async () => {
    // Only a non-consent command in the queue — proves the race is caused by
    // the consent entry specifically, not by activation itself.
    setQueue([['walker config', { tagging: 1 }]]);

    const { collector, elb } = await startFlow({
      sources: {
        browser: {
          code: sourceBrowser,
          config: {
            require: ['consent'],
            settings: {
              pageview: false,
              elb: false,
              prefix: 'data-elb',
            },
          },
        },
      },
    });

    // Browser source is registered with require: ['consent'] still pending.
    expect(collector.sources.browser).toBeDefined();
    expect(collector.sources.browser.config.require).toContain('consent');

    await elb('walker consent', { marketing: true });

    expect(collector.sources.browser).toBeDefined();
    expect(collector.consent.marketing).toBe(true);
  });

  test('walker user in queue clobbers fresh user state on activation', async () => {
    // Same root cause as consent: walker user merge + queue replay AFTER
    // fresh state lands.
    setQueue([['walker user', { id: 'stale-id' }]]);

    const { collector, elb } = await startFlow({
      sources: {
        browser: {
          code: sourceBrowser,
          config: {
            require: ['consent'],
            settings: {
              pageview: false,
              elb: false,
              prefix: 'data-elb',
            },
          },
        },
      },
    });

    await elb('walker user', { id: 'fresh-id' });
    await elb('walker consent', { marketing: true });

    // Fresh id should win — but stale queued id replays during activation.
    expect(collector.user.id).toBe('fresh-id');
  });

  test('post-init pushes to elbLayer accumulate without ever clearing', async () => {
    // After initElbLayer overrides .push, items are appended on every push
    // (elbLayer.ts line ~40) and never cleared again. The array grows
    // unbounded for the lifetime of the page.
    const { elb } = await startFlow({
      consent: { marketing: true }, // skip the require gate for this test
      sources: {
        browser: {
          code: sourceBrowser,
          config: {
            settings: {
              pageview: false,
              elb: false,
              prefix: 'data-elb',
            },
          },
        },
      },
    });

    const layer = (window as unknown as Record<string, unknown>)[
      elbLayerKey
    ] as unknown[];

    // Simulate a page-level script pushing a few events post-init.
    layer.push(['product view', { id: 'A' }]);
    layer.push(['product view', { id: 'B' }]);
    layer.push(['product view', { id: 'C' }]);

    // Sanity: source ran the elb pipeline for these.
    // Bug: the array kept all of them — never cleared.
    expect(layer.length).toBe(3);
  });

  test('multi-source: CMP fires walker consent during own init, browser still parked', async () => {
    // Mirrors the real flow.mitgas.json shape: cmp + session + browser, where
    // cmp grants consent during init. The browser source has require:
    // ['consent']; we need to verify it activates *and* receives 'run'.
    const collected: string[] = [];

    const cmpSource = async (ctx: {
      env: { elb: (...a: unknown[]) => Promise<unknown> };
    }) => ({
      // Side-effect-free factory: consent push lives in init.
      type: 'cmp',
      config: {},
      push: jest.fn(),
      init: async () => {
        await ctx.env.elb('walker consent', { marketing: true });
      },
    });

    // Defer `walker run` until after the push spy is wired. Otherwise the
    // pageview fires inside startFlow (CMP grants consent during pass 2 →
    // browser require empties before init runs → browser starts → run fires
    // synchronously) and the spy misses it.
    const { collector } = await startFlow({
      run: false,
      sources: {
        cmp: { code: cmpSource as never },
        browser: {
          code: sourceBrowser,
          config: {
            require: ['consent'],
            settings: {
              pageview: true,
              elb: false,
              prefix: 'data-elb',
            },
          },
        },
      },
    });

    // Capture events emitted by the browser source after activation.
    const realPush = collector.push;
    collector.push = (async (event: unknown, options?: unknown) => {
      const e = event as { name?: string };
      if (e?.name) collected.push(e.name);
      return realPush(event as never, options as never);
    }) as Collector.Instance['push'];

    // Browser source should have activated via CMP's consent grant: init ran
    // (config.init === true) and require has been emptied.
    expect(collector.sources.browser).toBeDefined();
    expect(collector.sources.browser.config.init).toBe(true);
    expect(collector.sources.browser.config.require?.length || 0).toBe(0);

    // Trigger the run via the collector's command interface (the startFlow
    // primary `elb` here is cmp's push — a jest.fn() — so we can't rely on
    // it for plumbing). Pageview should now fire and be captured by the spy.
    await collector.command('run');

    expect(collected).toContain('page view');
  });
});
