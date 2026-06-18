import type { Destination, WalkerOS } from '@walkeros/core';
import { createEvent, stepId } from '@walkeros/core';
import { collector } from '../collector';
import { pushToDestinations } from '../destination';
import {
  __resetBreakerNow,
  __setBreakerNow,
  isBreakerProbePermitted,
} from '../breaker';

/**
 * Step-general circuit breaker (keyed by `stepId()`).
 *
 * These tests drive the REAL push path (`pushToDestinations` against a real
 * `collector({})`) — not the breaker helpers in isolation — so they prove the
 * gate, the failure/success accounting, and the canonical-key resolution all
 * agree. Time is controlled through the injectable breaker clock
 * (`__setBreakerNow`) so open→half-open is deterministic without fake timers.
 */

const BREAKER_KEY = stepId('destination', 'd1');

/** A real, push-allowed collector. */
async function makeCollector() {
  const c = await collector({});
  c.allowed = true;
  return c;
}

/** A destination whose push() outcome is controlled by `behavior()`. */
function makeDestination(
  behavior: () => 'ok' | 'throw',
  config: Destination.Config,
  push: jest.Mock,
): Destination.Instance {
  return {
    type: 'mock',
    config,
    push: push.mockImplementation((_event: WalkerOS.Event) => {
      if (behavior() === 'throw') throw new Error('transport down');
      return { ok: true };
    }),
  };
}

describe('circuit breaker', () => {
  let now: number;

  beforeEach(() => {
    now = 1_000_000;
    __setBreakerNow(() => now);
  });

  afterEach(() => {
    __resetBreakerNow();
  });

  test('presence-gated: with no breaker config, events are never skipped', async () => {
    const push = jest.fn();
    let outcome: 'ok' | 'throw' = 'throw';
    const destination = makeDestination(() => outcome, {}, push);
    const c = await makeCollector();
    c.destinations.d1 = destination;

    for (let i = 0; i < 10; i++) {
      await pushToDestinations(c, createEvent());
    }

    // Every event was pushed (and failed); no breaker entry exists.
    expect(push).toHaveBeenCalledTimes(10);
    expect(c.status.breakers[BREAKER_KEY]).toBeUndefined();
  });

  test('N consecutive transport failures open the breaker; later events skip', async () => {
    const push = jest.fn();
    const destination = makeDestination(() => 'throw', { breaker: 3 }, push);
    const c = await makeCollector();
    c.destinations.d1 = destination;

    // 3 consecutive failures → opens on the 3rd.
    await pushToDestinations(c, createEvent());
    await pushToDestinations(c, createEvent());
    await pushToDestinations(c, createEvent());

    expect(push).toHaveBeenCalledTimes(3);
    expect(c.status.breakers[BREAKER_KEY].state).toBe('open');
    expect(c.status.breakers[BREAKER_KEY].consecutiveFailures).toBe(3);

    // Subsequent events are skipped (counted, not pushed).
    await pushToDestinations(c, createEvent());
    await pushToDestinations(c, createEvent());
    expect(push).toHaveBeenCalledTimes(3);
  });

  test('CONSECUTIVE not cumulative: fail, fail, success, fail does NOT open at threshold 3', async () => {
    const push = jest.fn();
    let outcome: 'ok' | 'throw' = 'throw';
    const destination = makeDestination(() => outcome, { breaker: 3 }, push);
    const c = await makeCollector();
    c.destinations.d1 = destination;

    outcome = 'throw';
    await pushToDestinations(c, createEvent()); // fail (1)
    await pushToDestinations(c, createEvent()); // fail (2)
    outcome = 'ok';
    await pushToDestinations(c, createEvent()); // success → reset
    outcome = 'throw';
    await pushToDestinations(c, createEvent()); // fail (1)

    expect(c.status.breakers[BREAKER_KEY].state).toBe('closed');
    expect(c.status.breakers[BREAKER_KEY].consecutiveFailures).toBe(1);
    // All four reached the destination (never skipped).
    expect(push).toHaveBeenCalledTimes(4);
  });

  test('cooldown elapses → half-open admits exactly one probe; concurrent burst admits only one', async () => {
    const push = jest.fn();
    let outcome: 'ok' | 'throw' = 'throw';
    const destination = makeDestination(
      () => outcome,
      { breaker: { threshold: 2, cooldown: 5000 } },
      push,
    );
    const c = await makeCollector();
    c.destinations.d1 = destination;

    // Open the breaker (2 consecutive failures).
    await pushToDestinations(c, createEvent());
    await pushToDestinations(c, createEvent());
    expect(c.status.breakers[BREAKER_KEY].state).toBe('open');
    expect(push).toHaveBeenCalledTimes(2);

    // Within cooldown: skipped.
    now += 1000;
    await pushToDestinations(c, createEvent());
    expect(push).toHaveBeenCalledTimes(2);

    // Advance past cooldown, then fire a concurrent burst at the boundary.
    now += 5000;
    outcome = 'throw';
    await Promise.all([
      pushToDestinations(c, createEvent()),
      pushToDestinations(c, createEvent()),
      pushToDestinations(c, createEvent()),
    ]);
    // Exactly one probe admitted; the other two saw half-open and skipped.
    expect(push).toHaveBeenCalledTimes(3);
    // Probe failed → re-opened with a fresh window.
    expect(c.status.breakers[BREAKER_KEY].state).toBe('open');
  });

  test('probe success closes the breaker', async () => {
    const push = jest.fn();
    let outcome: 'ok' | 'throw' = 'throw';
    const destination = makeDestination(
      () => outcome,
      { breaker: { threshold: 2, cooldown: 5000 } },
      push,
    );
    const c = await makeCollector();
    c.destinations.d1 = destination;

    await pushToDestinations(c, createEvent());
    await pushToDestinations(c, createEvent());
    expect(c.status.breakers[BREAKER_KEY].state).toBe('open');

    now += 6000;
    outcome = 'ok';
    await pushToDestinations(c, createEvent()); // probe succeeds
    expect(c.status.breakers[BREAKER_KEY].state).toBe('closed');
    expect(c.status.breakers[BREAKER_KEY].consecutiveFailures).toBe(0);
    expect(push).toHaveBeenCalledTimes(3);
  });

  test('probe failure re-opens with a fresh window; no re-open storm within the open window', async () => {
    const push = jest.fn();
    const destination = makeDestination(
      () => 'throw',
      { breaker: { threshold: 2, cooldown: 5000 } },
      push,
    );
    const c = await makeCollector();
    c.destinations.d1 = destination;

    await pushToDestinations(c, createEvent());
    await pushToDestinations(c, createEvent());
    const firstOpenUntil = c.status.breakers[BREAKER_KEY].openUntil;

    now += 6000;
    await pushToDestinations(c, createEvent()); // probe fails → re-open
    const secondOpenUntil = c.status.breakers[BREAKER_KEY].openUntil;
    expect(c.status.breakers[BREAKER_KEY].state).toBe('open');
    expect(secondOpenUntil).toBeGreaterThan(firstOpenUntil ?? 0);
    expect(push).toHaveBeenCalledTimes(3);

    // Within the new window: all skipped, no extra pushes (no storm).
    await pushToDestinations(c, createEvent());
    await pushToDestinations(c, createEvent());
    expect(push).toHaveBeenCalledTimes(3);
  });

  test('canonical-key: config.id differs from map key, breaker still opens', async () => {
    const push = jest.fn();
    const destination = makeDestination(
      () => 'throw',
      { id: 'real-id', breaker: 2 },
      push,
    );
    const c = await makeCollector();
    // Register under a DIFFERENT map key than config.id.
    c.destinations.mapKey = destination;

    await pushToDestinations(c, createEvent());
    await pushToDestinations(c, createEvent());

    const canonicalKey = stepId('destination', 'real-id');
    expect(c.status.breakers[canonicalKey].state).toBe('open');
    // No breaker entry under the map key — proves gate + accounting agree.
    expect(c.status.breakers[stepId('destination', 'mapKey')]).toBeUndefined();

    // Next event is skipped (gate reads the canonical entry).
    await pushToDestinations(c, createEvent());
    expect(push).toHaveBeenCalledTimes(2);
  });

  describe('batch path', () => {
    test('a whole-batch throw trips the breaker', async () => {
      const pushBatch = jest.fn(() => {
        throw new Error('batch transport down');
      });
      const destination: Destination.Instance = {
        type: 'mock',
        push: jest.fn(),
        pushBatch,
        config: {
          breaker: 1,
          // 1-minute debounce; we flush manually for determinism.
          batch: { wait: 60_000 },
        },
      };
      const c = await makeCollector();
      c.destinations.d1 = destination;

      await pushToDestinations(c, createEvent());
      // Force the flush (no timer advance).
      await c.destinations.d1.batches![' batch-all'].flush();

      expect(pushBatch).toHaveBeenCalledTimes(1);
      expect(c.status.breakers[BREAKER_KEY].state).toBe('open');
    });

    test('partial-failure rows are breaker-neutral (do not trip a healthy destination)', async () => {
      // Resolve a BatchOutcome listing one failed row per flush. With threshold
      // 1 a cumulative counter would open after the first poison row; a
      // breaker-neutral partial keeps it closed.
      const pushBatch = jest.fn(
        (): Destination.BatchOutcome => ({ failed: [{ index: 0 }] }),
      );
      const destination: Destination.Instance = {
        type: 'mock',
        push: jest.fn(),
        pushBatch,
        config: {
          breaker: 1,
          batch: { wait: 60_000 },
        },
      };
      const c = await makeCollector();
      c.destinations.d1 = destination;

      // Two events so at least one row is delivered (index 1 succeeds).
      await pushToDestinations(c, createEvent());
      await pushToDestinations(c, createEvent());
      await c.destinations.d1.batches![' batch-all'].flush();

      // Delivered rows → success closes/keeps closed; partial row never trips.
      expect(c.status.breakers[BREAKER_KEY].state).toBe('closed');
      expect(c.status.breakers[BREAKER_KEY].consecutiveFailures).toBe(0);
    });
  });

  describe('probe never deadlocks half-open', () => {
    test('init throws on the probe → re-opens (transport-failure) and still recovers later', async () => {
      const push = jest.fn().mockReturnValue({ ok: true });
      let initShouldThrow = true;
      const init = jest.fn(() => {
        if (initShouldThrow) throw new Error('init transport down');
        return undefined;
      });
      const destination: Destination.Instance = {
        type: 'mock',
        init,
        push,
        config: { breaker: { threshold: 2, cooldown: 5000 } },
      };
      const c = await makeCollector();
      c.destinations.d1 = destination;

      // Two failing inits open the breaker (each throw is a transport failure).
      await pushToDestinations(c, createEvent());
      await pushToDestinations(c, createEvent());
      expect(c.status.breakers[BREAKER_KEY].state).toBe('open');

      // Cooldown elapses → probe admitted, but its init throws again. The probe
      // MUST settle (re-open), not leave probing stuck.
      now += 6000;
      await pushToDestinations(c, createEvent());
      expect(c.status.breakers[BREAKER_KEY].state).toBe('open');
      expect(c.status.breakers[BREAKER_KEY].probing).toBe(false);

      // Transport heals; after another cooldown the breaker probes again and
      // closes — proving it was NOT stuck half-open.
      initShouldThrow = false;
      now += 6000;
      await pushToDestinations(c, createEvent());
      expect(c.status.breakers[BREAKER_KEY].state).toBe('closed');
      expect(push).toHaveBeenCalled();
    });

    test('consent-denied probe → released (not counted as a failure) and recovers later', async () => {
      const push = jest.fn();
      let outcome: 'ok' | 'throw' = 'throw';
      const destination = makeDestination(
        () => outcome,
        {
          breaker: { threshold: 2, cooldown: 5000 },
          consent: { marketing: true },
        },
        push,
      );
      const c = await makeCollector();
      c.consent = { marketing: true };
      c.destinations.d1 = destination;

      // Two consent-granted failing pushes open the breaker.
      const granted = () => {
        const e = createEvent();
        e.consent = { marketing: true };
        return e;
      };
      await pushToDestinations(c, granted());
      await pushToDestinations(c, granted());
      expect(c.status.breakers[BREAKER_KEY].state).toBe('open');
      expect(c.status.breakers[BREAKER_KEY].consecutiveFailures).toBe(2);
      const pushesAfterOpen = push.mock.calls.length;

      // Cooldown elapses, but the probe event is consent-denied: it never
      // reaches the transport, so it must RELEASE the probe (no failure count),
      // not deadlock half-open.
      now += 6000;
      c.consent = {};
      const denied = createEvent();
      denied.consent = {};
      await pushToDestinations(c, denied);
      expect(c.status.breakers[BREAKER_KEY].state).toBe('open');
      expect(c.status.breakers[BREAKER_KEY].probing).toBe(false);
      // The consent skip did NOT count as a transport failure.
      expect(c.status.breakers[BREAKER_KEY].consecutiveFailures).toBe(2);
      expect(push.mock.calls.length).toBe(pushesAfterOpen);

      // Healthy + consent-granted event after a fresh cooldown → probe closes.
      outcome = 'ok';
      c.consent = { marketing: true };
      now += 6000;
      await pushToDestinations(c, granted());
      expect(c.status.breakers[BREAKER_KEY].state).toBe('closed');
    });

    test('full recovery cycle: open → probe-fail → probe-succeed → closed', async () => {
      const push = jest.fn();
      let outcome: 'ok' | 'throw' = 'throw';
      const destination = makeDestination(
        () => outcome,
        { breaker: { threshold: 2, cooldown: 5000 } },
        push,
      );
      const c = await makeCollector();
      c.destinations.d1 = destination;

      // Open.
      await pushToDestinations(c, createEvent());
      await pushToDestinations(c, createEvent());
      expect(c.status.breakers[BREAKER_KEY].state).toBe('open');

      // Probe fails → re-open.
      now += 6000;
      await pushToDestinations(c, createEvent());
      expect(c.status.breakers[BREAKER_KEY].state).toBe('open');

      // Within the new window: skipped (no storm).
      const callsBefore = push.mock.calls.length;
      await pushToDestinations(c, createEvent());
      expect(push.mock.calls.length).toBe(callsBefore);

      // Probe succeeds after the next cooldown → closed.
      now += 6000;
      outcome = 'ok';
      await pushToDestinations(c, createEvent());
      expect(c.status.breakers[BREAKER_KEY].state).toBe('closed');
      expect(c.status.breakers[BREAKER_KEY].consecutiveFailures).toBe(0);
    });

    test('probe settles through the BATCH FLUSH path (throw re-opens, success closes)', async () => {
      let batchShouldThrow = true;
      const pushBatch = jest.fn((): Destination.BatchOutcome | void => {
        if (batchShouldThrow) throw new Error('batch transport down');
      });
      const destination: Destination.Instance = {
        type: 'mock',
        push: jest.fn(),
        pushBatch,
        config: {
          breaker: { threshold: 2, cooldown: 5000 },
          batch: { wait: 60_000 },
        },
      };
      const c = await makeCollector();
      c.destinations.d1 = destination;

      const flush = () => c.destinations.d1.batches![' batch-all'].flush();

      // Open via two whole-batch throws.
      await pushToDestinations(c, createEvent());
      await flush();
      await pushToDestinations(c, createEvent());
      await flush();
      expect(c.status.breakers[BREAKER_KEY].state).toBe('open');

      // Cooldown → probe admitted, enqueued, then flush THROWS: the flush path
      // must settle the probe (re-open), not leave it stuck.
      now += 6000;
      await pushToDestinations(c, createEvent());
      await flush();
      expect(c.status.breakers[BREAKER_KEY].state).toBe('open');
      expect(c.status.breakers[BREAKER_KEY].probing).toBe(false);

      // Cooldown → probe admitted, flush SUCCEEDS: the flush path closes it.
      batchShouldThrow = false;
      now += 6000;
      await pushToDestinations(c, createEvent());
      await flush();
      expect(c.status.breakers[BREAKER_KEY].state).toBe('closed');
    });
  });

  describe('isBreakerProbePermitted', () => {
    test('permits a probe when closed or half-open, blocks while open within cooldown', () => {
      expect(isBreakerProbePermitted(undefined, now)).toBe(true);
      expect(
        isBreakerProbePermitted(
          { state: 'closed', consecutiveFailures: 0 },
          now,
        ),
      ).toBe(true);
      expect(
        isBreakerProbePermitted(
          { state: 'half-open', consecutiveFailures: 3, probing: true },
          now,
        ),
      ).toBe(true);
      expect(
        isBreakerProbePermitted(
          { state: 'open', consecutiveFailures: 3, openUntil: now + 1000 },
          now,
        ),
      ).toBe(false);
      expect(
        isBreakerProbePermitted(
          { state: 'open', consecutiveFailures: 3, openUntil: now - 1 },
          now,
        ),
      ).toBe(true);
    });
  });
});
