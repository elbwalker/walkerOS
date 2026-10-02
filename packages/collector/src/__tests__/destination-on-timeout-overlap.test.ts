import type { Destination, On, WalkerOS } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { startFlow } from '..';
import { getStateHold, isStateDeliveryInFlight } from '../on';

type MockLogger = ReturnType<typeof createMockLogger>;

const TIMEOUT = 100;

/** Every call of the verb on the scoped logger tree, across all scopes. */
function loggerCalls(
  root: MockLogger,
  level: 'error' | 'debug',
  verb: string,
): unknown[][] {
  const calls: unknown[][] = [];
  const visited: MockLogger[] = [root];
  for (let i = 0; i < visited.length; i++) {
    const node = visited[i];
    calls.push(...node[level].mock.calls.filter((args) => args[0] === verb));
    visited.push(...node.scopedLoggers);
  }
  return calls;
}

/** A promise with external resolve and reject. */
function deferred(): {
  promise: Promise<void>;
  resolve: () => void;
  reject: (err: Error) => void;
} {
  let resolve: () => void = () => undefined;
  let reject: (err: Error) => void = () => undefined;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * A destination whose first on(consent) call waits on `first`; every later
 * call settles at once. The log records each call's start and the consent
 * it applied when it ended, which is the vendor's state after that call.
 */
function overlapRecorder(
  log: string[],
  first: Promise<void>,
  config: Destination.Config = { timeout: TIMEOUT },
): Destination.Init {
  let calls = 0;
  const code: Destination.Instance = {
    type: 'overlap',
    config: {},
    init: () => undefined,
    push: (event: WalkerOS.Event) => {
      log.push(`push:${event.name}`);
    },
    on: async (type, context) => {
      if (type !== 'consent') return;
      const applied = JSON.stringify(context.data);
      log.push(`start:${applied}`);
      calls++;
      if (calls === 1) {
        try {
          await first;
        } catch (err) {
          log.push(`reject:${applied}`);
          throw err;
        }
      }
      log.push(`end:${applied}`);
    },
  };
  return { code, config };
}

/** Start a grant whose handler call hangs past the destination's timeout. */
async function grantThatTimesOut(
  elb: (event: string, data: WalkerOS.Properties) => Promise<unknown>,
): Promise<void> {
  const grant = elb('walker consent', { marketing: true });
  await jest.advanceTimersByTimeAsync(TIMEOUT);
  await grant;
}

describe('a timed-out on() still running', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('a grant that lands after its timeout is overwritten by the later deny before any event is delivered', async () => {
    const log: string[] = [];
    const hung = deferred();
    const logger = createMockLogger();
    const { elb, collector } = await startFlow({
      destinations: { d: overlapRecorder(log, hung.promise) },
    });
    await elb('page view', {});
    Object.assign(collector, { logger });
    log.length = 0;

    await grantThatTimesOut(elb);
    await elb('page view', {});
    await elb('walker consent', { marketing: false });
    await jest.advanceTimersByTimeAsync(TIMEOUT);
    await elb('page view', {});

    // The late grant lands on the vendor now. Its settle re-delivers the
    // current consent and drains the held events, with no further push.
    hung.resolve();
    await jest.advanceTimersByTimeAsync(0);
    expect(log).toEqual([
      'start:{"marketing":true}',
      'end:{"marketing":true}',
      'start:{"marketing":false}',
      'end:{"marketing":false}',
      'push:page view',
      'push:page view',
    ]);
    expect(getStateHold(collector.destinations.d)).toBeUndefined();
    expect(isStateDeliveryInFlight(collector.destinations.d)).toBe(false);
    expect(loggerCalls(logger, 'error', 'on callback failed')).toHaveLength(1);
    expect(
      loggerCalls(logger, 'debug', 'late settle after timeout'),
    ).toHaveLength(1);
  });

  test('no second on() call starts while the timed-out one runs', async () => {
    const log: string[] = [];
    const hung = deferred();
    const { elb, collector } = await startFlow({
      destinations: { d: overlapRecorder(log, hung.promise) },
    });
    await elb('page view', {});
    log.length = 0;

    await grantThatTimesOut(elb);
    await elb('walker consent', { marketing: false });
    await elb('walker consent', { marketing: true, functional: true });
    for (let i = 0; i < 3; i++) {
      await jest.advanceTimersByTimeAsync(TIMEOUT);
      await elb('page view', {});
    }

    expect(log).toEqual(['start:{"marketing":true}']);
    expect(isStateDeliveryInFlight(collector.destinations.d)).toBe(true);
    expect(collector.destinations.d.queuePush).toHaveLength(3);
  });

  test('a sibling destination keeps receiving events during the hang', async () => {
    const log: string[] = [];
    const sibling: string[] = [];
    const hung = deferred();
    const settled = deferred();
    settled.resolve();
    const { elb, collector } = await startFlow({
      destinations: {
        d: overlapRecorder(log, hung.promise),
        e: overlapRecorder(sibling, settled.promise),
      },
    });
    await elb('page view', {});
    sibling.length = 0;

    await grantThatTimesOut(elb);
    await elb('page view', {});
    await elb('walker consent', { marketing: false });
    await elb('page view', {});

    expect(sibling).toEqual([
      'start:{"marketing":true}',
      'end:{"marketing":true}',
      'push:page view',
      'start:{"marketing":false}',
      'end:{"marketing":false}',
      'push:page view',
    ]);
    expect(getStateHold(collector.destinations.e)).toBeUndefined();
    expect(getStateHold(collector.destinations.d)).toBeDefined();
  });

  test('a handler that never settles keeps the destination held, and walker run discards its held events', async () => {
    const log: string[] = [];
    const { elb, collector } = await startFlow({
      destinations: {
        d: overlapRecorder(log, new Promise<void>(() => undefined)),
      },
    });
    await elb('page view', {});
    log.length = 0;

    await grantThatTimesOut(elb);
    await elb('walker consent', { marketing: false });
    for (let i = 0; i < 3; i++) {
      await jest.advanceTimersByTimeAsync(TIMEOUT * 10);
      await elb('page view', {});
    }
    expect(collector.destinations.d.queuePush).toHaveLength(3);

    await elb('walker run');
    await elb('page view', {});

    expect(log).toEqual(['start:{"marketing":true}']);
    expect(getStateHold(collector.destinations.d)).toBeDefined();
    expect(collector.destinations.d.queuePush).toHaveLength(1);
  });

  test('a grant that rejects after its timeout behaves like one that resolves late', async () => {
    const log: string[] = [];
    const hung = deferred();
    const logger = createMockLogger();
    const { elb, collector } = await startFlow({
      destinations: { d: overlapRecorder(log, hung.promise) },
    });
    await elb('page view', {});
    Object.assign(collector, { logger });
    log.length = 0;

    await grantThatTimesOut(elb);
    await elb('page view', {});
    await elb('walker consent', { marketing: false });

    hung.reject(new Error('sdk down'));
    await jest.advanceTimersByTimeAsync(0);

    expect(log).toEqual([
      'start:{"marketing":true}',
      'reject:{"marketing":true}',
      'start:{"marketing":false}',
      'end:{"marketing":false}',
      'push:page view',
    ]);
    expect(getStateHold(collector.destinations.d)).toBeUndefined();
    expect(isStateDeliveryInFlight(collector.destinations.d)).toBe(false);
    expect(loggerCalls(logger, 'error', 'on callback failed')).toHaveLength(1);
  });

  test('a late settle while frequent other-cell commands arrive still recovers at once', async () => {
    const log: string[] = [];
    const hung = deferred();
    const { elb, collector } = await startFlow({
      destinations: { d: overlapRecorder(log, hung.promise) },
    });
    await elb('page view', {});
    log.length = 0;

    await grantThatTimesOut(elb);
    await elb('walker consent', { marketing: false });
    await elb('page view', {});
    await elb('walker globals', { tick: 1 });

    hung.resolve();
    await jest.advanceTimersByTimeAsync(0);

    expect(log).toEqual([
      'start:{"marketing":true}',
      'end:{"marketing":true}',
      'start:{"marketing":false}',
      'end:{"marketing":false}',
      'push:page view',
    ]);
    expect(getStateHold(collector.destinations.d)).toBeUndefined();
  });
});

describe('state deliveries to one destination run one at a time', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('a deny sent while a slower grant is still running is applied after it', async () => {
    const log: string[] = [];
    const slow = deferred();
    const { elb, collector } = await startFlow({
      destinations: { d: overlapRecorder(log, slow.promise) },
    });
    await elb('page view', {});
    log.length = 0;

    const grant = elb('walker consent', { marketing: true });
    const deny = elb('walker consent', { marketing: false });
    const push = elb('page view', {});
    await jest.advanceTimersByTimeAsync(TIMEOUT / 2);
    slow.resolve();
    await Promise.all([grant, deny, push]);

    expect(log).toEqual([
      'start:{"marketing":true}',
      'end:{"marketing":true}',
      'start:{"marketing":false}',
      'end:{"marketing":false}',
      'push:page view',
    ]);
    expect(getStateHold(collector.destinations.d)).toBeUndefined();
    expect(isStateDeliveryInFlight(collector.destinations.d)).toBe(false);
  });

  test('a waiting delivery carries the cell as it is at its turn, and a delivery with nothing new is skipped', async () => {
    const log: string[] = [];
    const slow = deferred();
    const { elb } = await startFlow({
      destinations: { d: overlapRecorder(log, slow.promise) },
    });
    await elb('page view', {});
    log.length = 0;

    const commands = [
      elb('walker consent', { marketing: true }),
      elb('walker consent', { marketing: false }),
      elb('walker consent', { functional: true }),
    ];
    await jest.advanceTimersByTimeAsync(TIMEOUT / 2);
    slow.resolve();
    await Promise.all(commands);

    expect(log).toEqual([
      'start:{"marketing":true}',
      'end:{"marketing":true}',
      'start:{"marketing":false,"functional":true}',
      'end:{"marketing":false,"functional":true}',
    ]);
  });

  test('a slow delivery to one destination does not delay its sibling', async () => {
    const log: string[] = [];
    const sibling: string[] = [];
    const slow = deferred();
    const settled = deferred();
    settled.resolve();
    const { elb } = await startFlow({
      destinations: {
        d: overlapRecorder(log, slow.promise),
        e: overlapRecorder(sibling, settled.promise),
      },
    });
    await elb('page view', {});
    sibling.length = 0;

    const grant = elb('walker consent', { marketing: true });
    const deny = elb('walker consent', { marketing: false });
    await jest.advanceTimersByTimeAsync(0);
    expect(sibling).toEqual([
      'start:{"marketing":true}',
      'end:{"marketing":true}',
      'start:{"marketing":false}',
      'end:{"marketing":false}',
    ]);
    slow.resolve();
    await Promise.all([grant, deny]);
  });
});

describe('state deliveries to one source run one at a time', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * A started source whose first on(consent) call waits on `first`. With a
   * source in the flow, `elb` is that source's push, so commands go through
   * `collector.command`.
   */
  function sourceRecorder(log: string[], first: Promise<void>) {
    let calls = 0;
    return {
      code: async () => ({
        type: 'overlapSource',
        config: {},
        push: jest.fn(),
        on: async (type: string, data: unknown) => {
          if (type !== 'consent') return;
          const applied = JSON.stringify(data);
          log.push(`start:${applied}`);
          if (++calls === 1) await first;
          log.push(`end:${applied}`);
        },
      }),
    };
  }

  test('a deny sent while a slower grant is still running reaches the source after it', async () => {
    const log: string[] = [];
    const slow = deferred();
    const { collector } = await startFlow({
      sources: { s: sourceRecorder(log, slow.promise) },
    });
    log.length = 0;

    const grant = collector.command('consent', { marketing: true });
    const deny = collector.command('consent', { marketing: false });
    await jest.advanceTimersByTimeAsync(0);
    slow.resolve();
    await Promise.all([grant, deny]);
    await jest.advanceTimersByTimeAsync(0);

    expect(log).toEqual([
      'start:{"marketing":true}',
      'end:{"marketing":true}',
      'start:{"marketing":false}',
      'end:{"marketing":false}',
    ]);
  });

  test('a source grant that lands after its timeout is followed by the current consent', async () => {
    const log: string[] = [];
    const hung = deferred();
    const { collector } = await startFlow({
      sources: { s: sourceRecorder(log, hung.promise) },
    });
    log.length = 0;

    const grant = collector.command('consent', { marketing: true });
    await jest.advanceTimersByTimeAsync(10_000);
    await grant;
    await collector.command('consent', { marketing: false });
    hung.resolve();
    await jest.advanceTimersByTimeAsync(0);

    expect(log).toEqual([
      'start:{"marketing":true}',
      'end:{"marketing":true}',
      'start:{"marketing":false}',
      'end:{"marketing":false}',
    ]);
  });
});

describe('a handler that re-emits state during a catch-up outside a command', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('the held retry at a push is stopped by the cascade bound', async () => {
    const log: string[] = [];
    const logger = createMockLogger();
    let calls = 0;
    const code: Destination.Instance = {
      type: 'reemit',
      config: {},
      init: () => undefined,
      push: (event: WalkerOS.Event) => {
        log.push(`push:${event.name}`);
      },
      on: async (type, context) => {
        if (type !== 'consent') return;
        calls++;
        if (calls === 1) throw new Error('sdk down');
        // Safety stop so an unbounded loop fails the test instead of hanging.
        if (calls > 50) return;
        await context.collector.command('consent', { marketing: true });
      },
    };
    const { elb, collector } = await startFlow({
      destinations: { d: { code, config: { timeout: TIMEOUT } } },
    });
    await elb('page view', {});
    Object.assign(collector, { logger });

    await elb('walker consent', { marketing: true });
    expect(calls).toBe(1);
    await jest.advanceTimersByTimeAsync(TIMEOUT);
    await elb('page view', {});
    await jest.advanceTimersByTimeAsync(0);

    // One rejected call, then at most MAX + 1 within the retry's cascade.
    expect(calls).toBeGreaterThan(1);
    expect(calls).toBeLessThanOrEqual(10);
    expect(log).toEqual(['push:page view']);
    expect(getStateHold(collector.destinations.d)).toBeDefined();
    expect(collector.destinations.d.queuePush).toHaveLength(1);
    expect(
      loggerCalls(logger, 'error', 'state delivery did not converge'),
    ).toHaveLength(1);
  });
});

describe('a state command deferred behind a running call, for a cell with no content', () => {
  test('an empty user update sent from a consent rule does not hold the destination', async () => {
    const events: string[] = [];
    const types: string[] = [];
    const code: Destination.Instance = {
      type: 'capture',
      config: {},
      init: () => undefined,
      push: (event: WalkerOS.Event) => {
        events.push(event.name);
      },
      on: (type) => {
        types.push(String(type));
      },
    };
    const { collector } = await startFlow({
      destinations: { capture: { code } },
    });
    // As the session source does: the rule sets an (empty) user, then pushes.
    let fired = 0;
    const rule: On.ConsentFn = () => {
      fired++;
      void collector.command('user', {});
      if (fired === 1) void collector.push({ name: 'session start' });
    };
    await collector.command('on', {
      type: 'consent',
      rules: { marketing: rule },
    });
    types.length = 0;

    await collector.command('consent', { marketing: false });
    await collector.command('consent', { marketing: false });

    expect(types).toEqual(['consent', 'user', 'consent', 'user']);
    expect(events).toEqual(['session start']);
    expect(getStateHold(collector.destinations.capture)).toBeUndefined();
  });
});
