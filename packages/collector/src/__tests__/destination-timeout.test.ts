import type { Destination } from '@walkeros/core';
import { createEvent } from '@walkeros/core';
import { pushToDestinations, startFlow } from '..';

/**
 * Per-destination delivery timeout: a single slow/hanging destination must
 * not wedge the whole collector push. A push that never settles within the
 * configured (or default) timeout is converted into a bounded, counted
 * failure routed to the SAME DLQ a thrown push uses, and other destinations
 * keep delivering (error isolation preserved).
 */
describe('Destination delivery timeout', () => {
  function makeDestination(
    push: Destination.Instance['push'],
    config: Destination.Config = {},
  ): Destination.Instance {
    return { push, config };
  }

  // A push that never settles, typed to the destination push contract.
  const neverResolves: Destination.Instance['push'] = () =>
    new Promise<void>(() => undefined);

  function errorMessage(value: unknown): string {
    return value instanceof Error ? value.message : String(value);
  }

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('hanging push times out, routes to DLQ, push resolves (not hung)', async () => {
    const event = createEvent();
    const { collector } = await startFlow({
      destinations: {
        slow: { code: makeDestination(neverResolves, { timeout: 5_000 }) },
      },
    });

    const resultPromise = pushToDestinations(
      collector,
      event,
      {},
      collector.destinations,
    );

    // Advance past the timeout to trigger the race rejection.
    await jest.advanceTimersByTimeAsync(5_000);

    const result = await resultPromise;
    const dest = collector.destinations['slow'];

    expect(result.ok).toBeFalsy();
    expect(result.failed).toBeDefined();
    expect(Object.keys(result.failed!)).toHaveLength(1);
    expect(dest.dlq).toBeDefined();
    expect(dest.dlq).toHaveLength(1);
    // DLQ pair carries the original event and a timeout-cause error.
    expect(dest.dlq![0][0]).toEqual(event);
    const dlqError = dest.dlq![0][1];
    expect(dlqError).toBeInstanceOf(Error);
    if (dlqError instanceof Error) {
      // Discriminable name so DLQ entries are distinguishable without substring match.
      expect(dlqError.name).toBe('DestinationTimeoutError');
      expect(dlqError.message).toContain('timed out');
      expect(dlqError.message).toContain('5000');
    }
  });

  test('isolation: a hang on one destination does not block a healthy one', async () => {
    const event = createEvent();
    const healthyPush = jest.fn(async () => undefined);

    const { collector } = await startFlow({
      destinations: {
        slow: { code: makeDestination(neverResolves, { timeout: 5_000 }) },
        healthy: { code: makeDestination(healthyPush, { timeout: 5_000 }) },
      },
    });

    const resultPromise = pushToDestinations(
      collector,
      event,
      {},
      collector.destinations,
    );

    await jest.advanceTimersByTimeAsync(5_000);
    const result = await resultPromise;

    // Healthy destination delivered exactly once, unaffected by the hang.
    expect(healthyPush).toHaveBeenCalledTimes(1);
    // The slow one failed to DLQ.
    expect(collector.destinations['slow'].dlq).toHaveLength(1);
    expect(collector.destinations['healthy'].dlq ?? []).toHaveLength(0);
    // Overall result reflects one failure but did not hang.
    expect(result.failed).toBeDefined();
    expect(Object.keys(result.failed!)).toHaveLength(1);
  });

  test('a push that settles before the timeout is unaffected (no false timeout)', async () => {
    const event = createEvent();
    const fastPush = jest.fn(async () => 'ok');

    const { collector } = await startFlow({
      destinations: {
        fast: { code: makeDestination(fastPush, { timeout: 5_000 }) },
      },
    });

    // Baseline timers held by collector infra (e.g. cache-store sweep).
    const baselineTimers = jest.getTimerCount();

    const result = await pushToDestinations(
      collector,
      event,
      {},
      collector.destinations,
    );

    expect(fastPush).toHaveBeenCalledTimes(1);
    expect(result.ok).toBeTruthy();
    expect(collector.destinations['fast'].dlq ?? []).toHaveLength(0);
    // The healthy delivery is counted as delivered.
    expect(collector.status.out).toBe(1);

    // The race added no net timer: its cleared on settle.
    expect(jest.getTimerCount()).toBe(baselineTimers);
  });

  test('default timeout applies when none configured', async () => {
    const event = createEvent();
    const { collector } = await startFlow({
      destinations: {
        slow: { code: makeDestination(neverResolves) },
      },
    });

    const resultPromise = pushToDestinations(
      collector,
      event,
      {},
      collector.destinations,
    );

    // Just before default (10000ms): still pending, no DLQ yet.
    await jest.advanceTimersByTimeAsync(9_999);
    expect(collector.destinations['slow'].dlq ?? []).toHaveLength(0);

    // Cross the default boundary: now it times out.
    await jest.advanceTimersByTimeAsync(1);
    const result = await resultPromise;
    const dest = collector.destinations['slow'];

    expect(dest.dlq).toHaveLength(1);
    expect(errorMessage(dest.dlq![0][1])).toContain('10000');
    expect(Object.keys(result.failed!)).toHaveLength(1);
  });

  test('config timeout overrides the default', async () => {
    const event = createEvent();
    const { collector } = await startFlow({
      destinations: {
        slow: { code: makeDestination(neverResolves, { timeout: 2_000 }) },
      },
    });

    const resultPromise = pushToDestinations(
      collector,
      event,
      {},
      collector.destinations,
    );

    await jest.advanceTimersByTimeAsync(2_000);
    const result = await resultPromise;
    const dest = collector.destinations['slow'];

    expect(dest.dlq).toHaveLength(1);
    expect(errorMessage(dest.dlq![0][1])).toContain('2000');
    expect(Object.keys(result.failed!)).toHaveLength(1);
  });

  test('regression: a thrown push still routes to DLQ (isolation unchanged)', async () => {
    const event = createEvent();
    const throwingPush: Destination.Instance['push'] = () => {
      throw new Error('kaputt');
    };

    const { collector } = await startFlow({
      destinations: {
        boom: { code: makeDestination(throwingPush, { timeout: 5_000 }) },
      },
    });

    const baselineTimers = jest.getTimerCount();

    const result = await pushToDestinations(
      collector,
      event,
      {},
      collector.destinations,
    );
    const dest = collector.destinations['boom'];

    expect(result.failed).toBeDefined();
    expect(Object.keys(result.failed!)).toHaveLength(1);
    expect(dest.dlq).toContainEqual([event, new Error('kaputt')]);
    // The race must not leave a timer behind on the synchronous-throw path.
    expect(jest.getTimerCount()).toBe(baselineTimers);
  });
});
