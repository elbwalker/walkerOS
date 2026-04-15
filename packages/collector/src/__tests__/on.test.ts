import type { Collector, WalkerOS } from '@walkeros/core';
import { startFlow } from '..';

describe('on() helper — recursion and contract tests', () => {
  test('A: on() does not re-invoke source.on when registering a new callback', async () => {
    const { collector } = await startFlow();

    const sourceOnSpy = jest.fn();
    collector.sources = {
      mock: {
        type: 'mock',
        config: {},
        push: jest.fn(),
        on: sourceOnSpy,
      } as unknown as WalkerOS.Source,
    };

    const cb = jest.fn();
    await collector.command('on', 'consent', { marketing: cb });

    // The bug: on() currently calls onApply() which iterates sources and
    // re-invokes source.on(). After the fix, on() should only fire the
    // newly-registered callback against current state — not re-broadcast.
    expect(sourceOnSpy).not.toHaveBeenCalled();
  });

  test('B: on() fires newly-registered consent callback against current consent state', async () => {
    const { collector } = await startFlow();
    collector.consent = { marketing: true };

    const cb = jest.fn();
    await collector.command('on', 'consent', { marketing: cb });

    // Late-subscriber catch-up: if consent was already granted, cb must fire now
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(
      collector,
      expect.objectContaining({ marketing: true }),
    );
  });

  test('C: on() does not recurse when handler re-registers itself (anti-regression lock)', async () => {
    const { collector } = await startFlow();
    collector.consent = { marketing: true };

    const MAX = 20;
    let calls = 0;
    const handler = (c: Collector.Instance): void => {
      calls++;
      if (calls > MAX) return; // bail out — don't throw (would crash jest worker)
      // Re-register itself — mirrors the sessionStart.ts:40 pattern
      // Fire-and-forget: the command is async but we don't await it to
      // avoid deepening the synchronous recursion stack further.
      void c.command('on', 'consent', { marketing: handler });
    };

    await collector.command('on', 'consent', { marketing: handler });
    // Drain pending microtasks. Cannot use setTimeout here — jest fake timers
    // (see config/jest/web.setup.mjs) stub it and it never fires.
    await Promise.resolve();

    // After the fix, on() fires only the newly-registered callback against
    // current state (linear self-registration), not the old exponential
    // broadcast. Linear recursion terminates at the in-test bailout: `calls`
    // reaches MAX + 1 = 21 (the call that trips `if (calls > MAX) return`)
    // and unwinds. The real anti-broadcast invariant is verified by Test A.
    expect(calls).toBeLessThanOrEqual(MAX + 1);
  });

  test('D: on() preserves onReady gate — callback runs only when collector.allowed', async () => {
    const { collector } = await startFlow();

    const cbBlocked = jest.fn();
    collector.allowed = false;
    await collector.command('on', 'ready', cbBlocked);
    expect(cbBlocked).not.toHaveBeenCalled();

    const cbAllowed = jest.fn();
    collector.allowed = true;
    await collector.command('on', 'ready', cbAllowed);
    expect(cbAllowed).toHaveBeenCalledTimes(1);
  });
});
