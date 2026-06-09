import type { On, Source, WalkerOS } from '@walkeros/core';
import { startFlow } from '..';

/**
 * Run-barrier re-delivery: at `run` the collector becomes `allowed`. Any
 * subscriber owed a deferred pre-run state delivery (mark < stateVersion) must
 * be re-delivered current state exactly once, so its reaction (e.g. a session
 * source pushing `session start`) emits into the now-open, consent-gated
 * pipeline. The per-subscriber high-water mark provides exactly-once for free.
 */
describe('run-barrier re-delivery', () => {
  /**
   * Build a dependent inline `code` source whose init registers a consent rule
   * via `env.command('on', ...)`. The rule's handler pushes a `gated` event
   * through the source's `env.push`, which routes into the consent-gated
   * pipeline. Returns the source definition for startFlow.
   */
  function makeConsentReactingSource() {
    return {
      code: async (ctx: Source.Context) => {
        return {
          type: 'dep',
          config: {},
          push: ctx.env.push,
          init: async () => {
            await ctx.env.command('on', {
              type: 'consent',
              rules: {
                marketing: (consent: WalkerOS.Consent): void => {
                  if (consent.marketing) {
                    void ctx.env.push({ name: 'gated event', data: {} });
                  }
                },
              },
            });
          },
        };
      },
    };
  }

  /** Capture destination with NO config.consent: the only gate is the barrier. */
  function makeCaptureDestination(captured: WalkerOS.Event[]) {
    return {
      code: {
        type: 'capture',
        config: {},
        push: (event: WalkerOS.Event): void => {
          captured.push(event);
        },
      },
    };
  }

  function gatedCount(captured: WalkerOS.Event[]): number {
    return captured.filter((e) => e.name === 'gated event').length;
  }

  test('I3: deferred pre-run consent is re-delivered once at run', async () => {
    const captured: WalkerOS.Event[] = [];

    const { collector } = await startFlow({
      run: false,
      sources: { dep: makeConsentReactingSource() },
      destinations: { cap: makeCaptureDestination(captured) },
    });

    // Consent granted pre-run: deferred (collector not allowed). The rule's
    // handler must NOT have pushed `gated` yet.
    await collector.command('consent', { marketing: true });
    expect(gatedCount(captured)).toBe(0);

    // Run opens the barrier: the owed consent rule is re-delivered once, its
    // handler pushes `gated`, which now flows to the capture destination.
    await collector.command('run');
    expect(gatedCount(captured)).toBe(1);
  });

  test('I4: consent granted AFTER run fires exactly once', async () => {
    const captured: WalkerOS.Event[] = [];

    const { collector } = await startFlow({
      run: true,
      sources: { dep: makeConsentReactingSource() },
      destinations: { cap: makeCaptureDestination(captured) },
    });

    // Already allowed; granting consent now delivers exactly once via the
    // normal broadcast path (not the barrier), and must not double-fire.
    await collector.command('consent', { marketing: true });
    expect(gatedCount(captured)).toBe(1);
  });

  test('I7a: run({consent}) on a run:false collector fires exactly once', async () => {
    const captured: WalkerOS.Event[] = [];

    const { collector } = await startFlow({
      run: false,
      sources: { dep: makeConsentReactingSource() },
      destinations: { cap: makeCaptureDestination(captured) },
    });

    // Consent supplied via the run command itself (RunState merge bumps
    // stateVersion, then the barrier re-delivers the owed rule once).
    await collector.command('run', { consent: { marketing: true } });
    expect(gatedCount(captured)).toBe(1);
  });

  test('I7b: consent emitted with zero dependent subscribers, subscriber added later, then run → once', async () => {
    const captured: WalkerOS.Event[] = [];

    const { collector, elb } = await startFlow({
      run: false,
      destinations: { cap: makeCaptureDestination(captured) },
    });

    // Consent granted before any dependent subscriber exists. Deferred.
    await collector.command('consent', { marketing: true });
    expect(gatedCount(captured)).toBe(0);

    // Now register the dependent subscriber (the reaction a dependent source
    // would register). Registration catch-up sees consent already present but
    // is still pre-run, so it is deferred (owed at the barrier).
    await collector.command('on', {
      type: 'consent',
      rules: {
        marketing: (consent: WalkerOS.Consent): void => {
          if (consent.marketing) void elb({ name: 'gated event', data: {} });
        },
      },
    });
    expect(gatedCount(captured)).toBe(0);

    // Run opens the barrier: the owed rule re-delivers exactly once.
    await collector.command('run');
    expect(gatedCount(captured)).toBe(1);
  });

  test('I8: consent never granted → zero', async () => {
    const captured: WalkerOS.Event[] = [];

    const { collector } = await startFlow({
      run: false,
      sources: { dep: makeConsentReactingSource() },
      destinations: { cap: makeCaptureDestination(captured) },
    });

    // Run with no consent ever granted: nothing to re-deliver.
    await collector.command('run');
    expect(gatedCount(captured)).toBe(0);
  });

  test('denied-then-granted within a round → once against granted state', async () => {
    const captured: WalkerOS.Event[] = [];

    const { collector } = await startFlow({
      run: false,
      sources: { dep: makeConsentReactingSource() },
      destinations: { cap: makeCaptureDestination(captured) },
    });

    // Deny then grant, both pre-run. Both deferred; only the latest (granted)
    // state matters at the barrier.
    await collector.command('consent', { marketing: false });
    await collector.command('consent', { marketing: true });
    expect(gatedCount(captured)).toBe(0);

    await collector.command('run');
    expect(gatedCount(captured)).toBe(1);
  });

  test('I13: a source reacting via source.on ALONE is re-delivered once at run', async () => {
    const captured: WalkerOS.Event[] = [];
    const onConsentSeen: unknown[] = [];

    // No on() rule: the source's own `on` handler is the only subscriber.
    const onlyOnSource = {
      code: async (ctx: Source.Context) => {
        return {
          type: 'dep-on',
          config: {},
          push: ctx.env.push,
          on: (type: On.Types, data?: unknown): void => {
            if (type === 'consent') {
              onConsentSeen.push(data);
              if (
                typeof data === 'object' &&
                data !== null &&
                'marketing' in data &&
                data.marketing === true
              ) {
                void ctx.env.push({ name: 'gated event', data: {} });
              }
            }
          },
        };
      },
    };

    const { collector } = await startFlow({
      run: false,
      sources: { dep: onlyOnSource },
      destinations: { cap: makeCaptureDestination(captured) },
    });

    await collector.command('consent', { marketing: true });
    // Pre-run: source.on consent delivery deferred (not fired).
    expect(onConsentSeen).toHaveLength(0);
    expect(gatedCount(captured)).toBe(0);

    await collector.command('run');
    // Barrier re-delivers the consent state to the owed source.on exactly once.
    expect(onConsentSeen).toHaveLength(1);
    expect(gatedCount(captured)).toBe(1);
  });
});
