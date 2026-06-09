import type { Source, WalkerOS } from '@walkeros/core';
import { startFlow } from '..';

/**
 * Composite lock-in tests for the run-barrier / per-subscriber mark mechanism.
 *
 * These confirm that the building blocks from the state-delivery and
 * run-barrier work compose into four end-to-end guarantees: re-run does not
 * double-deliver, pre-run events are not leaked through the dormant gate,
 * the outcome is independent of source registration order, and repeated
 * pre-run consent grants collapse into a single re-delivery at the barrier.
 *
 * Most assertions are regression locks: the mark mechanism already makes them
 * hold. A real inline `code` source plus an array-capture destination (no
 * `config.consent`) is used so the only state gate is the barrier itself.
 */
describe('state re-delivery composite guarantees', () => {
  /**
   * Dependent inline `code` source: its init registers a consent rule via
   * `env.command('on', ...)`. The rule pushes a `gated event` through the
   * source's `env.push` whenever marketing consent is granted, routing into
   * the consent-gated pipeline.
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

  /**
   * Provider inline `code` source: its init grants marketing consent via
   * `env.command('consent', ...)`. Paired with the dependent source above to
   * exercise order-independence of the run barrier.
   */
  function makeConsentProvidingSource() {
    return {
      code: async (ctx: Source.Context) => {
        return {
          type: 'provider',
          config: {},
          push: ctx.env.push,
          init: async () => {
            await ctx.env.command('consent', { marketing: true });
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

  test('I5: a second run does not re-deliver an already-delivered subscriber', async () => {
    const captured: WalkerOS.Event[] = [];

    const { collector } = await startFlow({
      run: false,
      sources: { dep: makeConsentReactingSource() },
      destinations: { cap: makeCaptureDestination(captured) },
    });

    // Pre-run consent grant: deferred (collector not allowed).
    await collector.command('consent', { marketing: true });
    expect(gatedCount(captured)).toBe(0);

    // First run opens the barrier: the owed rule re-delivers exactly once.
    await collector.command('run');
    expect(gatedCount(captured)).toBe(1);

    // Second run finds nothing owed: the subscriber's mark already equals the
    // current stateVersion, so the barrier re-delivers nothing.
    await collector.command('run');
    expect(gatedCount(captured)).toBe(1);
  });

  test('I9: a pre-run direct event is dropped at the dormant gate and never leaks', async () => {
    const captured: WalkerOS.Event[] = [];

    const { collector, elb } = await startFlow({
      run: false,
      destinations: { cap: makeCaptureDestination(captured) },
    });

    // Direct event push before run. pushToDestinations returns early at the
    // `!allowed` gate before the event is ever appended to collector.queue, so
    // a pre-run event is dropped outright. There is no pre-run event buffer:
    // collector.queue is the post-run replay buffer for late-registered
    // destinations only. The RECORD-immediate/DELIVER-gated rule that applies
    // to state (consent/user/globals/custom) does NOT apply to events, so a
    // pre-run event cannot leak through the barrier.
    await elb({ name: 'page view', data: {} });
    expect(captured).toHaveLength(0);

    // Run opens the barrier. The dropped pre-run event is not resurrected: it
    // was never queued, so nothing flushes for it.
    await collector.command('run');
    expect(captured.filter((e) => e.name === 'page view')).toHaveLength(0);

    // A direct event pushed AFTER run delivers normally, proving the gate is
    // about pre-run dormancy, not a broken destination.
    await elb({ name: 'page view', data: {} });
    expect(captured.filter((e) => e.name === 'page view')).toHaveLength(1);
  });

  test('I6: outcome is independent of source registration order (provider before dependent)', async () => {
    const captured: WalkerOS.Event[] = [];

    const { collector } = await startFlow({
      run: false,
      sources: {
        provider: makeConsentProvidingSource(),
        dep: makeConsentReactingSource(),
      },
      destinations: { cap: makeCaptureDestination(captured) },
    });

    await collector.command('run');
    expect(gatedCount(captured)).toBe(1);
  });

  test('I6: outcome is independent of source registration order (dependent before provider)', async () => {
    const captured: WalkerOS.Event[] = [];

    const { collector } = await startFlow({
      run: false,
      sources: {
        dep: makeConsentReactingSource(),
        provider: makeConsentProvidingSource(),
      },
      destinations: { cap: makeCaptureDestination(captured) },
    });

    await collector.command('run');
    expect(gatedCount(captured)).toBe(1);
  });

  test('grant-then-grant pre-run collapses into a single run-barrier re-delivery', async () => {
    const captured: WalkerOS.Event[] = [];

    const { collector } = await startFlow({
      run: false,
      sources: { dep: makeConsentReactingSource() },
      destinations: { cap: makeCaptureDestination(captured) },
    });

    // Two identical pre-run grants. Each bumps stateVersion, but both stay
    // deferred (collector not allowed). Only the latest state is owed.
    await collector.command('consent', { marketing: true });
    await collector.command('consent', { marketing: true });
    expect(gatedCount(captured)).toBe(0);

    // Run opens the barrier: both pre-run grants collapse into one re-delivery.
    await collector.command('run');
    expect(gatedCount(captured)).toBe(1);
  });
});
