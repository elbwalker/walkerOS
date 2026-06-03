import type { On, WalkerOS, Source } from '@walkeros/core';
import { startFlow } from '..';

/**
 * Task 5: bounded recursion guard for cascading/cyclic state deliveries.
 *
 * A state-delivery callback may emit a new state command, which re-enters the
 * onApply cascade. A cyclic cascade (A reacts to user by emitting consent, B
 * reacts to consent by emitting user, with ever-changing values that keep
 * bumping stateVersion) would recurse until stack overflow without a guard.
 *
 * The guard tracks a per-(subscriber, cell-type) revision count within ONE
 * originating top-level command's cascade. When a single (subscriber, cell-type)
 * would be delivered more than K times, it stops delivering that pair and logs
 * a single non-convergence error. Legitimate wide fan-out (many distinct
 * subscribers, or one subscriber across distinct cells) must NOT trip.
 */
describe('bounded recursion guard for cascading state deliveries', () => {
  test('I10: a cyclic cascade terminates and logs a non-convergence error', async () => {
    // Two `on()` rules form a cycle:
    //   on('user')    rule -> emits command('consent', { marketing: <changing> })
    //   on('consent') rule -> emits command('user',    { id:        <changing> })
    // Each emission carries a distinct value so stateVersion keeps bumping. The
    // reactions re-enter the delivery cascade synchronously, which without the
    // guard recurses until `RangeError: Maximum call stack size exceeded`.
    //
    // The in-test safety cap (n > 50) exists ONLY so the RED run terminates via
    // the missing-error-log assertion instead of crashing the jest worker with
    // a stack overflow. Once the guard exists, the GUARD (not this cap) stops
    // the cascade well before 50 hops; we verify by asserting the error log
    // fired (the cap itself logs nothing).
    //
    // (A source-`on` cycle does NOT reproduce: the exactly-once high-water mark
    // plus the fire-and-forget `void command()` microtask ordering bounds it to
    // ~2 hops naturally. The `on()` rule path re-enters synchronously, so it is
    // the genuine unbounded reproducer. The source delivery site is still
    // guarded; the fan-out tests below lock that it does not false-positive.)
    let nUser = 0;
    let nConsent = 0;

    const { collector } = await startFlow({
      run: true,
      logger: { handler: () => undefined },
    });

    const userRule: On.GenericFn = (_data, ctx): void => {
      if (nUser > 50) return; // in-test safety cap (see comment above)
      nUser++;
      void ctx.collector.command('consent', { marketing: nUser % 2 === 0 });
    };
    const consentRule: On.ConsentRule = {
      marketing: (_data: WalkerOS.Consent, ctx?: On.Context): void => {
        if (!ctx) return;
        if (nConsent > 50) return; // in-test safety cap (see comment above)
        nConsent++;
        void ctx.collector.command('user', { id: `u${nConsent}` });
      },
    };

    await collector.command('on', { type: 'user', rules: userRule });
    await collector.command('on', { type: 'consent', rules: consentRule });

    const errorSpy = jest.spyOn(collector.logger, 'error');

    // Trigger the cascade with an initial post-run user command.
    await collector.command('user', { id: 'seed' });

    // The call returned (no stack overflow, no jest timeout) AND the guard
    // stopped it well before the in-test cap (so the cap never logged).
    expect(nUser).toBeLessThan(50);
    expect(nConsent).toBeLessThan(50);

    const convergenceErrors = errorSpy.mock.calls.filter(
      ([message]) =>
        typeof message === 'string' &&
        message.toLowerCase().includes('did not converge'),
    );
    expect(convergenceErrors.length).toBeGreaterThanOrEqual(1);

    errorSpy.mockRestore();
  });

  test('wide fan-out: N distinct subscribers each fire once, no bail, no error', async () => {
    // One originating consent command delivered to 5 distinct inline sources,
    // each of which pushes ONE event and emits NO further state. All 5 fire
    // once; the guard must not trip.
    const pushed: string[] = [];

    const makeSource = (id: string) => ({
      code: async (): Promise<Source.Instance> => ({
        type: id,
        config: {},
        push: jest.fn(),
        on: (type: string): void => {
          if (type !== 'consent') return;
          pushed.push(id);
        },
      }),
    });

    const { collector } = await startFlow({
      run: true,
      sources: {
        s1: makeSource('s1'),
        s2: makeSource('s2'),
        s3: makeSource('s3'),
        s4: makeSource('s4'),
        s5: makeSource('s5'),
      },
    });

    const errorSpy = jest.spyOn(collector.logger, 'error');

    await collector.command('consent', { marketing: true });

    expect(pushed.sort()).toEqual(['s1', 's2', 's3', 's4', 's5']);

    const convergenceErrors = errorSpy.mock.calls.filter(
      ([message]) =>
        typeof message === 'string' &&
        message.toLowerCase().includes('did not converge'),
    );
    expect(convergenceErrors).toHaveLength(0);

    errorSpy.mockRestore();
  });

  test('two-step cascade across distinct cells: completes, no bail, no error', async () => {
    // One subscriber that on consent emits ONE command('user', ...). Distinct
    // cells (consent then user), so the per-(subscriber, cell) count stays at 1.
    // No bail, no error.
    let emitted = false;

    const { collector } = await startFlow({
      run: true,
      sources: {
        s: {
          code: async (): Promise<Source.Instance> => ({
            type: 's',
            config: {},
            push: jest.fn(),
            on: (type: string): void => {
              if (type === 'consent' && !emitted) {
                emitted = true;
                void collector.command('user', { id: 'u1' });
              }
            },
          }),
        },
      },
    });

    const errorSpy = jest.spyOn(collector.logger, 'error');

    await collector.command('consent', { marketing: true });

    expect(emitted).toBe(true);
    expect(collector.user).toEqual({ id: 'u1' });

    const convergenceErrors = errorSpy.mock.calls.filter(
      ([message]) =>
        typeof message === 'string' &&
        message.toLowerCase().includes('did not converge'),
    );
    expect(convergenceErrors).toHaveLength(0);

    errorSpy.mockRestore();
  });
});
