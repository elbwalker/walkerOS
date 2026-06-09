import { startFlow } from '..';
import { fireCallbacks, on, onApply, redeliverStateAtRun } from '../on';

/**
 * Defense-in-depth: a FOREIGN/non-collector first argument must never throw
 * into host-page code. Models the case where a leaked, minified internal
 * (`fireCallbacks`) gets aliased onto a global that collides with another
 * library's API (e.g. a global named `ga`) and is invoked with foreign args
 * like `("sent", "event", …)`, entering the dispatch with the string `"sent"`
 * as the "collector" and crashing on `"sent".logger.scope`.
 *
 * A foreign caller respects no TypeScript signature. To model that faithfully
 * without `as` casts in the test, each dispatch entry is invoked via
 * `Reflect.apply`, whose argument list is intentionally untyped, exactly how a
 * leaked, minified JS global would be called from host code with no compile-time
 * contract. The guard inside the production code is the unit under test.
 */
describe('foreign-dispatch guard', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  // Mirror the foreign call shape: a leaked fireCallbacks invoked as
  // ga("sent", "event"). The first arg is the string "sent" (no `.logger`),
  // the second is the string "event" (used as `type`).
  test('fireCallbacks("sent","event") does not throw and no-ops', () => {
    expect(() => {
      Reflect.apply(fireCallbacks, undefined, ['sent', 'event', []]);
    }).not.toThrow();
  });

  test('fireCallbacks with a logger-less object does not throw or fire', () => {
    const cb = jest.fn();
    expect(() => {
      Reflect.apply(fireCallbacks, undefined, [{}, 'user', [cb]]);
    }).not.toThrow();
    expect(cb).not.toHaveBeenCalled();
  });

  test('on() with a non-collector first arg does not throw and no-ops', async () => {
    const cb = jest.fn();
    await expect(
      Reflect.apply(on, undefined, ['sent', 'consent', cb]),
    ).resolves.toBeUndefined();
    expect(cb).not.toHaveBeenCalled();
  });

  test('onApply() with a non-collector first arg does not throw and returns not-vetoed', async () => {
    await expect(
      Reflect.apply(onApply, undefined, [{}, 'consent']),
    ).resolves.toBe(true);
  });

  test('redeliverStateAtRun() with a non-collector first arg does not throw', async () => {
    await expect(
      Reflect.apply(redeliverStateAtRun, undefined, ['sent']),
    ).resolves.toBeUndefined();
  });

  // Positive control: a real collector still dispatches normally; the guard is
  // a no-op for the valid path.
  test('positive control: a real collector still fires callbacks', async () => {
    const { collector } = await startFlow();
    collector.consent = { marketing: true };

    const cb = jest.fn();
    await collector.command('on', {
      type: 'consent',
      rules: { marketing: cb },
    });

    expect(cb).toHaveBeenCalledTimes(1);
  });
});
