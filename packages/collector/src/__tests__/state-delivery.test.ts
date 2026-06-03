import type { On, WalkerOS } from '@walkeros/core';
import { startFlow, onApply } from '..';

describe('collector-enforced exactly-once state delivery', () => {
  test('defers a pre-run consent broadcast: callback does not fire and mark does not advance while !allowed', async () => {
    // run:false => collector.allowed stays false (no run yet).
    const { collector } = await startFlow({ run: false });

    const fired: WalkerOS.Consent[] = [];
    const rule = {
      marketing: (data: WalkerOS.Consent): void => {
        fired.push(data);
      },
    };

    // Register the rule. Catch-up at registration: stateVersion is still 0
    // and no consent key is present yet, so nothing fires here.
    await collector.command('on', { type: 'consent', rules: rule });

    expect(fired).toHaveLength(0);

    // Grant consent via command (bumps stateVersion). Because the collector
    // is not allowed (pre-run), the broadcast delivery MUST be deferred.
    await collector.command('consent', { marketing: true });

    // Deferred: callback did not run...
    expect(fired).toHaveLength(0);
    // ...and the subscriber's mark did not advance (still the -1 sentinel).
    expect(collector.delivery.get(rule)).toBeUndefined();
  });

  test('allowed-path consent fires exactly once and a same-version re-notify does not re-fire', async () => {
    // run:true (default) => collector.allowed is true.
    const { collector } = await startFlow();

    const fired: WalkerOS.Consent[] = [];
    const rule = {
      marketing: (data: WalkerOS.Consent): void => {
        fired.push(data);
      },
    };
    await collector.command('on', { type: 'consent', rules: rule });
    // Registration catch-up: no consent key present yet, nothing fires.
    expect(fired).toHaveLength(0);

    // Grant consent: bumps stateVersion, broadcast delivers exactly once.
    await collector.command('consent', { marketing: true });
    expect(fired).toHaveLength(1);
    // Per-cell mark advanced to the consent cell's version.
    expect(collector.delivery.get(rule)?.consent).toBe(
      collector.cellVersion.consent,
    );

    // A second broadcast at the SAME version (no state bump) must NOT re-fire:
    // stateVersion is no longer > mark.
    await onApply(collector, 'consent', undefined, collector.consent);
    expect(fired).toHaveLength(1);
  });

  test('gated generic state type (user) fires exactly once via the fireCallbacks generic branch', async () => {
    const { collector } = await startFlow();

    const fired: WalkerOS.User[] = [];
    const fn: On.GenericFn = (data): void => {
      fired.push(data as WalkerOS.User);
    };
    await collector.command('on', { type: 'user', rules: fn });
    // Registration catch-up fires once against current (empty) user state:
    // stateVersion(0) > sentinel(-1) and allowed, so the generic branch runs.
    expect(fired).toHaveLength(1);
    // At registration the user cell has never bumped (version 0 == stateVersion).
    expect(collector.delivery.get(fn)?.user).toBe(collector.stateVersion);

    // Set user: bumps stateVersion, broadcast delivers exactly once more.
    await collector.command('user', { id: 'u1' });
    expect(fired).toHaveLength(2);
    expect(collector.delivery.get(fn)?.user).toBe(collector.cellVersion.user);

    // Same-version re-notify must NOT re-fire the generic subscriber.
    await onApply(collector, 'user', undefined, collector.user);
    expect(fired).toHaveLength(2);
  });

  test('source queueOn flush defers a state delivery while !allowed (no fire, mark not advanced)', async () => {
    const onCalls: Array<{ type: string; data: unknown }> = [];

    // Source is unstarted until its `require: ['user']` is satisfied. While
    // unstarted, onApply queues state deliveries to source.queueOn. When the
    // require empties (user granted), the queue is flushed.
    const { collector } = await startFlow({
      run: false,
      sources: {
        test: {
          config: { require: ['user'] },
          code: async () => ({
            type: 'test',
            config: {},
            push: jest.fn(),
            on: (type: string, data: unknown): void => {
              onCalls.push({ type, data });
            },
          }),
        },
      },
    });

    const source = collector.sources.test;

    // Grant consent pre-run: source is unstarted (require still has 'user'),
    // so the consent delivery is queued, not fired.
    await collector.command('consent', { marketing: true });
    expect(onCalls.filter((c) => c.type === 'consent')).toHaveLength(0);

    // Grant user pre-run (still !allowed): require empties, the source starts,
    // and the queued consent flush runs. Because the collector is NOT allowed,
    // that flushed state delivery MUST defer (not fire, mark not advanced).
    await collector.command('user', { id: 'u1' });

    expect(onCalls.filter((c) => c.type === 'consent')).toHaveLength(0);
    expect(collector.delivery.get(source)).toBeUndefined();
  });
});
