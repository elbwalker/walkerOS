import type { Destination, WalkerOS } from '@walkeros/core';
import { createMockLogger, FatalError } from '@walkeros/core';
import { startFlow } from '..';
import { getStateHold } from '../on';

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

type MockLogger = ReturnType<typeof createMockLogger>;

/**
 * The on-callback error path logs through a scoped child of the collector
 * logger, and createMockLogger().scope() returns a fresh child mock, so the
 * root's error mock never sees the call. Walk the scoped tree for the verb.
 */
function findLoggerError(
  root: MockLogger,
  verb: string,
): unknown[] | undefined {
  const visited: MockLogger[] = [root];
  for (let i = 0; i < visited.length; i++) {
    const node = visited[i];
    const call = node.error.mock.calls.find((args) => args[0] === verb);
    if (call) return call;
    visited.push(...node.scopedLoggers);
  }
  return undefined;
}

/** Records init, the start and end of on(consent), and each push, per tag. */
function asyncRecorder(
  log: string[],
  onBody: () => Promise<void>,
  config: Destination.Config = { consent: { marketing: true } },
  tag = 'd',
): Destination.Init {
  const code: Destination.Instance = {
    type: 'asyncOn',
    config: {},
    init: () => {
      log.push(`${tag}:init`);
    },
    push: (event: WalkerOS.Event) => {
      log.push(`${tag}:push:${event.name}`);
    },
    on: async (type) => {
      if (type !== 'consent') return;
      log.push(`${tag}:on:start`);
      await onBody();
      log.push(`${tag}:on:end`);
    },
  };
  return { code, config };
}

/** A promise with an external resolver, for the concurrency probes. */
function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('async destination on() settles before the first push', () => {
  // The package's jest setup installs fake timers before each test; these
  // tests measure real handler latency and real timeouts.
  beforeEach(() => {
    jest.useRealTimers();
  });

  test('an on(consent) that awaits before returning finishes before the queued event is pushed', async () => {
    const log: string[] = [];
    const { elb } = await startFlow({
      destinations: { d: asyncRecorder(log, () => sleep(30)) },
    });
    await elb('page view', {});
    await elb('walker consent', { marketing: true });
    expect(log).toEqual([
      'd:init',
      'd:on:start',
      'd:on:end',
      'd:push:page view',
    ]);
  });

  test('a live on(consent) on an initialized destination is awaited before the state command flushes', async () => {
    const log: string[] = [];
    const { elb } = await startFlow({
      destinations: { d: asyncRecorder(log, () => sleep(30), {}) },
    });
    await elb('page view', {});
    log.length = 0;
    await elb('walker consent', { marketing: true });
    await elb('page view', {});
    expect(log).toEqual(['d:on:start', 'd:on:end', 'd:push:page view']);
  });

  test('an on() that never settles holds the destination and nothing is pushed to it', async () => {
    const log: string[] = [];
    const logger = createMockLogger();
    const { elb, collector } = await startFlow({
      destinations: {
        d: asyncRecorder(log, () => new Promise<void>(() => undefined), {
          consent: { marketing: true },
          timeout: 20,
        }),
      },
    });
    Object.assign(collector, { logger });
    await elb('page view', {});
    await elb('walker consent', { marketing: true });
    expect(log).toEqual(['d:init', 'd:on:start']);
    expect(getStateHold(collector.destinations.d)?.type).toBe('consent');
    // Held, not dropped: the event is back in the destination's own queue.
    expect(collector.destinations.d.queuePush).toHaveLength(1);
    const errorCall = findLoggerError(logger, 'on callback failed');
    expect(errorCall?.[1]).toEqual(
      expect.objectContaining({
        kind: 'destination',
        destId: 'd',
        type: 'consent',
        name: 'DestinationTimeoutError',
      }),
    );
    expect(collector.status.failed).toBe(0);
  });

  test('a rejecting on() holds the destination and is logged as an on callback failure', async () => {
    const log: string[] = [];
    const logger = createMockLogger();
    const { elb, collector } = await startFlow({
      destinations: {
        d: asyncRecorder(log, () => Promise.reject(new Error('sdk down'))),
      },
    });
    Object.assign(collector, { logger });
    await elb('page view', {});
    await elb('walker consent', { marketing: true });
    expect(log).toEqual(['d:init', 'd:on:start']);
    expect(getStateHold(collector.destinations.d)?.type).toBe('consent');
    const errorCall = findLoggerError(logger, 'on callback failed');
    expect(errorCall?.[1]).toEqual(
      expect.objectContaining({
        kind: 'destination',
        destId: 'd',
        error: 'sdk down',
      }),
    );
    expect(collector.status.failed).toBe(0);
  });

  test('a held destination does not stop its sibling', async () => {
    const log: string[] = [];
    const { elb, collector } = await startFlow({
      destinations: {
        d: asyncRecorder(
          log,
          () => new Promise<void>(() => undefined),
          { consent: { marketing: true }, timeout: 20 },
          'd',
        ),
        e: asyncRecorder(
          log,
          () => Promise.resolve(),
          { consent: { marketing: true } },
          'e',
        ),
      },
    });
    await elb('page view', {});
    await elb('walker consent', { marketing: true });
    expect(log).toContain('e:on:end');
    expect(log).toContain('e:push:page view');
    expect(log).not.toContain('d:push:page view');
    expect(getStateHold(collector.destinations.d)?.type).toBe('consent');
    expect(getStateHold(collector.destinations.e)).toBeUndefined();
  });

  /**
   * Concurrency probe, deterministic rather than timed: d's handler cannot
   * finish until e's handler starts. Delivered one after another in map order
   * (d first), d waits for an e that has not begun and times out at 200ms.
   * Its `on:end` still arrives afterwards, late, so the log assertions alone
   * would not catch it: the `stateHold` assertion is the one that fails,
   * because a timed-out delivery holds.
   *
   * Both destinations carry NO consent requirement and the page view runs
   * first, so both are initialized when the consent command arrives and the
   * delivery takes onApply's live path. With a consent gate they would be
   * uninitialized, the delivery would go to `queueOn`, and the flush would run
   * inside `pushToDestinations`' own `Promise.all`, which is already
   * concurrent: the probe would pass against a sequential `onApply` and prove
   * nothing.
   */
  test('destinations are delivered concurrently, not one after another', async () => {
    const log: string[] = [];
    const gate = deferred();
    const { elb, collector } = await startFlow({
      destinations: {
        d: asyncRecorder(log, () => gate.promise, { timeout: 200 }, 'd'),
        e: asyncRecorder(
          log,
          async () => {
            gate.resolve();
          },
          { timeout: 200 },
          'e',
        ),
      },
    });
    await elb('page view', {});
    expect(collector.destinations.d.config.init).toBe(true);
    await elb('walker consent', { marketing: true });
    expect(log).toContain('d:on:end');
    expect(log).toContain('e:on:end');
    expect(getStateHold(collector.destinations.d)).toBeUndefined();
    expect(getStateHold(collector.destinations.e)).toBeUndefined();
  });

  /**
   * With a source in the flow, `elb` routes to that source's `push`, so these
   * two tests push and command through the collector directly.
   *
   * Same probe across the source and destination passes: the source handler
   * cannot finish until the destination handler has run. Delivering every
   * source before any destination does not deadlock, it resolves late, after
   * the source's own bound expires, so the ordering assertion alone would
   * still pass, ten seconds later. The assertion that separates the two is the
   * ABSENCE of a source timeout in the log: concurrent delivery settles the
   * source handler, sequential delivery logs it as timed out.
   */
  test('a slow source handler does not stop a destination delivery', async () => {
    const log: string[] = [];
    const logger = createMockLogger();
    const gate = deferred();
    const { collector } = await startFlow({
      sources: {
        s: {
          config: {},
          code: async () => ({
            type: 'hung',
            config: {},
            push: jest.fn(),
            on: async (type: string) => {
              if (type === 'consent') await gate.promise;
            },
          }),
        },
      },
      destinations: {
        d: asyncRecorder(
          log,
          async () => {
            gate.resolve();
          },
          { timeout: 200 },
        ),
      },
    });
    await collector.push({ name: 'page view' });
    log.length = 0;
    Object.assign(collector, { logger });
    await collector.command('consent', { marketing: true });
    expect(log).toEqual(['d:on:start', 'd:on:end']);
    // Sequential passes would have left the source waiting for its full bound.
    expect(findLoggerError(logger, 'on callback failed')).toBeUndefined();
  });

  /**
   * The source bound itself. It is the hard-coded default (sources carry no
   * per-step timeout config), so drive it with fake timers rather than waiting
   * ten real seconds.
   */
  test('a source handler that never settles is bounded and does not wedge the command', async () => {
    jest.useFakeTimers();
    try {
      const log: string[] = [];
      const logger = createMockLogger();
      const { collector } = await startFlow({
        sources: {
          s: {
            config: {},
            code: async () => ({
              type: 'hung',
              config: {},
              push: jest.fn(),
              on: async (type: string) => {
                if (type === 'consent')
                  await new Promise<void>(() => undefined);
              },
            }),
          },
        },
        destinations: { d: asyncRecorder(log, () => Promise.resolve(), {}) },
      });
      await collector.push({ name: 'page view' });
      Object.assign(collector, { logger });
      const command = collector.command('consent', { marketing: true });
      await jest.advanceTimersByTimeAsync(10_000);
      await command;
      expect(log).toContain('d:push:page view');
      const errorCall = findLoggerError(logger, 'on callback failed');
      expect(errorCall?.[1]).toEqual(
        expect.objectContaining({
          kind: 'source',
          name: 'DestinationTimeoutError',
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  test('a later state command re-delivers the owed cell, not only its own delta, before the held events drain', async () => {
    const log: string[] = [];
    let calls = 0;
    const { elb, collector } = await startFlow({
      destinations: {
        d: dataRecorder(
          log,
          () =>
            ++calls === 1
              ? Promise.reject(new Error('sdk down'))
              : Promise.resolve(),
          { consent: { marketing: true }, timeout: 20 },
        ),
      },
    });
    await elb('page view', {});
    await elb('walker consent', { marketing: true });
    expect(log).toEqual(['init', 'start:consent:{"marketing":true}']);

    // The failed delivery carried the marketing grant; the next command's
    // delta does not. The re-delivery carries the whole consent cell.
    await elb('walker consent', { functional: true });
    expect(getStateHold(collector.destinations.d)).toBeUndefined();
    expect(log).toEqual([
      'init',
      'start:consent:{"marketing":true}',
      'start:consent:{"marketing":true,"functional":true}',
      'end:consent',
      'push:page view',
    ]);
  });

  test('a failed queued delta is re-delivered as the cell by the next queued entry, before the first push', async () => {
    const log: string[] = [];
    let calls = 0;
    const { elb, collector } = await startFlow({
      destinations: {
        d: dataRecorder(
          log,
          () =>
            ++calls === 1
              ? Promise.reject(new Error('sdk down'))
              : Promise.resolve(),
          { consent: { marketing: true }, timeout: 20 },
        ),
      },
    });
    await elb('page view', {});
    // Not granted yet: the destination stays uninitialized and both deltas
    // wait in its queue for the init flush.
    await elb('walker consent', { functional: true });
    expect(log).toEqual([]);
    await elb('walker consent', { marketing: true });
    expect(getStateHold(collector.destinations.d)).toBeUndefined();
    expect(log).toEqual([
      'init',
      'start:consent:{"functional":true}',
      'start:consent:{"functional":true,"marketing":true}',
      'end:consent',
      'push:page view',
    ]);
  });
});

/** The consent the vendor holds: every delivered consent payload, in order. */
function vendorConsent(log: string[]): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  for (const line of log) {
    if (line.startsWith('start:consent:'))
      Object.assign(state, JSON.parse(line.slice('start:consent:'.length)));
  }
  return state;
}

/**
 * Records init, the start of every on() call with its type and data, the end
 * of every state on() call, and each push. `onBody` runs between start and
 * end for every call, lifecycle included.
 */
function dataRecorder(
  log: string[],
  onBody: (type: string) => Promise<void>,
  config: Destination.Config = { consent: { marketing: true } },
  lifecycle = false,
): Destination.Init {
  const code: Destination.Instance = {
    type: 'dataRecorder',
    config: {},
    init: () => {
      log.push('init');
    },
    push: (event: WalkerOS.Event) => {
      log.push(`push:${event.name}`);
    },
    on: async (type, context) => {
      const stateCell =
        type === 'consent' ||
        type === 'user' ||
        type === 'globals' ||
        type === 'custom';
      if (!stateCell && !lifecycle) return;
      const data = context.data;
      log.push(
        data === undefined
          ? `start:${type}`
          : `start:${type}:${JSON.stringify(data)}`,
      );
      await onBody(type);
      log.push(`end:${type}`);
    },
  };
  return { code, config };
}

describe('the hold covers the whole state delivery window', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  test('a push during an init flush of [run, consent] waits for the consent delivery', async () => {
    const log: string[] = [];
    const runStarted = deferred();
    const runGate = deferred();
    const { elb, collector } = await startFlow({
      destinations: {
        d: dataRecorder(
          log,
          async (type) => {
            if (type !== 'run') return;
            runStarted.resolve();
            await runGate.promise;
          },
          { consent: { marketing: true } },
          true,
        ),
      },
    });
    // `run` was queued while the destination was uninitialized; the grant
    // queues the consent behind it and starts the init flush.
    const grant = elb('walker consent', { marketing: true });
    await runStarted.promise;
    const push = collector.push({ name: 'page view' });
    await sleep(10);
    runGate.resolve();
    await Promise.all([grant, push]);
    expect(log).toEqual([
      'init',
      'start:run',
      'end:run',
      'start:consent:{"marketing":true}',
      'end:consent',
      'push:page view',
    ]);
  });

  test('two overlapping deliveries of the same cell: the first to settle does not release the second', async () => {
    const log: string[] = [];
    const gateA = deferred();
    const gateB = deferred();
    const secondStarted = deferred();
    let calls = 0;
    const { elb, collector } = await startFlow({
      destinations: {
        d: dataRecorder(
          log,
          () => {
            if (++calls === 1) return gateA.promise;
            secondStarted.resolve();
            return gateB.promise;
          },
          {},
        ),
      },
    });
    await elb('page view', {});
    log.length = 0;
    const commandA = collector.command('consent', { analytics: true });
    const commandB = collector.command('consent', { marketing: true });
    await elb('page view', {});
    gateA.resolve();
    await secondStarted.promise;
    expect(log).not.toContain('push:page view');
    gateB.resolve();
    await Promise.all([commandA, commandB]);
    // B arrives while A runs, so its handler call waits for A to settle and
    // then carries the whole cell as it is at that point.
    expect(log).toEqual([
      'start:consent:{"analytics":true}',
      'end:consent',
      'start:consent:{"analytics":true,"marketing":true}',
      'end:consent',
      'push:page view',
    ]);
  });

  test('a FatalError from a state handler propagates, and a later settled delivery still releases the hold', async () => {
    const log: string[] = [];
    let calls = 0;
    const { elb, collector } = await startFlow({
      destinations: {
        d: dataRecorder(
          log,
          async () => {
            if (++calls === 1) throw new FatalError('abort');
          },
          {},
        ),
      },
    });
    await elb('page view', {});
    log.length = 0;
    const thrown = await collector.command('consent', { marketing: true }).then(
      () => undefined,
      (err: unknown) => err,
    );
    expect(thrown).toBeInstanceOf(FatalError);
    expect(getStateHold(collector.destinations.d)?.type).toBe('consent');

    await elb('page view', {});
    expect(log).not.toContain('push:page view');

    await elb('walker consent', { functional: true });
    expect(getStateHold(collector.destinations.d)).toBeUndefined();
    expect(log).toEqual([
      'start:consent:{"marketing":true}',
      'start:consent:{"marketing":true,"functional":true}',
      'end:consent',
      'push:page view',
    ]);
  });

  /**
   * A source queueOn flush is driven with fake timers: sources share the
   * hard-coded default bound.
   */
  test('a source queueOn flush that times out is logged and is not a pipeline failure', async () => {
    jest.useFakeTimers();
    try {
      const logger = createMockLogger();
      const { collector } = await startFlow({
        sources: {
          s: {
            config: { require: ['user'] },
            code: async () => ({
              type: 'hung',
              config: {},
              push: jest.fn(),
              on: async (type: string) => {
                if (type === 'consent')
                  await new Promise<void>(() => undefined);
              },
            }),
          },
        },
      });
      Object.assign(collector, { logger });
      collector.status.failed = 0;
      // The consent waits in the unstarted source's queue; the user command
      // starts the source and flushes that queue.
      await collector.command('consent', { marketing: true });
      const command = collector.command('user', { id: 'u1' });
      await jest.advanceTimersByTimeAsync(10_000);
      await command;
      expect(collector.status.failed).toBe(0);
      const errorCall = findLoggerError(logger, 'source on flush failed');
      expect(errorCall?.[1]).toEqual(
        expect.objectContaining({
          sourceId: 's',
          type: 'consent',
          name: 'DestinationTimeoutError',
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  test('an event pushed after a revoke during the init flush is gated by the revoke, not by the consent the flush started with', async () => {
    const log: string[] = [];
    const runStarted = deferred();
    const runGate = deferred();
    const { elb, collector } = await startFlow({
      destinations: {
        d: dataRecorder(
          log,
          async (type) => {
            if (type !== 'run') return;
            runStarted.resolve();
            await runGate.promise;
          },
          { consent: { marketing: true } },
          true,
        ),
      },
    });
    const grant = elb('walker consent', { marketing: true });
    await runStarted.promise;
    await collector.command('consent', { marketing: false });
    const push = collector.push({ name: 'page view' });
    await sleep(10);
    runGate.resolve();
    await Promise.all([grant, push]);
    expect(log).not.toContain('push:page view');
    expect(collector.destinations.d.queuePush).toHaveLength(1);
    // The vendor ends in the collector's consent state.
    expect(vendorConsent(log)).toEqual(collector.consent);
    expect(collector.consent).toEqual({ marketing: false });
  });

  test('a live revoke during the init flush reaches on() after the queued grant, never before', async () => {
    const log: string[] = [];
    const runStarted = deferred();
    const runGate = deferred();
    const { elb, collector } = await startFlow({
      destinations: {
        d: dataRecorder(
          log,
          async (type) => {
            if (type !== 'run') return;
            runStarted.resolve();
            await runGate.promise;
          },
          { consent: { marketing: true } },
          true,
        ),
      },
    });
    const grant = elb('walker consent', { marketing: true });
    await runStarted.promise;
    const revoke = collector.command('consent', { marketing: false });
    await sleep(10);
    runGate.resolve();
    await Promise.all([grant, revoke]);
    const consents = log.filter((line) => line.startsWith('start:consent'));
    expect(consents).toEqual([
      'start:consent:{"marketing":true}',
      'start:consent:{"marketing":false}',
    ]);
  });

  test('a FatalError in the init flush leaves the remaining queued state owed and the destination held', async () => {
    const log: string[] = [];
    let runCalls = 0;
    const { elb, collector } = await startFlow({
      logger: { handler: () => undefined },
      destinations: {
        d: dataRecorder(
          log,
          async (type) => {
            if (type === 'run' && ++runCalls === 1)
              throw new FatalError('abort');
          },
          { consent: { marketing: true } },
          true,
        ),
      },
    });
    // The queued `run` throws first; the queued grant behind it never runs.
    await elb('walker consent', { marketing: true }).then(
      () => undefined,
      () => undefined,
    );
    expect(log).toEqual(['init', 'start:run']);
    expect(getStateHold(collector.destinations.d)?.type).toBe('consent');

    await elb('page view', {});
    expect(log).not.toContain('push:page view');

    await elb('walker consent', { functional: true });
    expect(getStateHold(collector.destinations.d)).toBeUndefined();
    expect(log).toEqual([
      'init',
      'start:run',
      'start:consent:{"marketing":true,"functional":true}',
      'end:consent',
      'push:page view',
    ]);
  });
});

/**
 * A destination recording init, on(consent) start and end, and pushes under
 * its tag, with hooks for the consent handler body and for every push.
 */
function hooked(
  log: string[],
  tag: string,
  onConsent: () => Promise<void>,
  onPush: () => void,
  config: Destination.Config,
): Destination.Init {
  const code: Destination.Instance = {
    type: 'hooked',
    config: {},
    init: () => {
      log.push(`${tag}:init`);
    },
    push: (event: WalkerOS.Event) => {
      log.push(`${tag}:push:${event.name}`);
      onPush();
    },
    on: async (type) => {
      if (type !== 'consent') return;
      log.push(`${tag}:on:start`);
      await onConsent();
      log.push(`${tag}:on:end`);
    },
  };
  return { code, config };
}

/**
 * A slow `on()` delays only its own destination. Destination A's consent
 * handler cannot finish until destination B has pushed an event, and A's
 * timeout is short: if B's push waits for A's delivery, A times out and is
 * held. A itself receives no event before its own delivery settles.
 */
describe('a slow on() delays only its own destination', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  test('live state command: the other destination is flushed without waiting', async () => {
    const log: string[] = [];
    const gate = deferred();
    let later: Promise<unknown> | undefined;
    let push: ((event: { name: string }) => Promise<unknown>) | undefined;
    const { collector } = await startFlow({
      destinations: {
        a: hooked(
          log,
          'a',
          () => gate.promise,
          () => undefined,
          {
            timeout: 200,
          },
        ),
        b: hooked(
          log,
          'b',
          () => Promise.resolve(),
          () => {
            // B's queued page view went out: an event pushed now must not
            // reach A before A's own consent delivery has settled.
            if (!later && push) later = push({ name: 'order complete' });
            gate.resolve();
          },
          { consent: { marketing: true } },
        ),
      },
    });
    push = (event) => collector.push(event);
    await collector.push({ name: 'page view' });
    log.length = 0;
    await collector.command('consent', { marketing: true });
    await later;
    expect(getStateHold(collector.destinations.a)).toBeUndefined();
    expect(log.indexOf('b:push:page view')).toBeGreaterThan(-1);
    expect(log.indexOf('b:push:page view')).toBeLessThan(
      log.indexOf('a:on:end'),
    );
    expect(log.indexOf('a:push:order complete')).toBeGreaterThan(
      log.indexOf('a:on:end'),
    );
  });

  test('walker run: the other destination receives the run event without waiting', async () => {
    const log: string[] = [];
    const gate = deferred();
    let armed = false;
    let push: ((event: { name: string }) => unknown) | undefined;
    const { collector } = await startFlow({
      sources: {
        // Pushes on every run, like a browser source.
        s: {
          code: async () => ({
            type: 'runPusher',
            config: {},
            push: jest.fn(),
            on: (type: string) => {
              if (type === 'run' && armed && push)
                void push({ name: 'page view' });
            },
          }),
        },
      },
      destinations: {
        a: hooked(
          log,
          'a',
          () => gate.promise,
          () => undefined,
          {
            timeout: 200,
          },
        ),
        b: hooked(
          log,
          'b',
          () => Promise.resolve(),
          () => {
            if (armed) gate.resolve();
          },
          {},
        ),
      },
    });
    push = (event) => collector.push(event);
    await collector.push({ name: 'session start' });
    log.length = 0;
    armed = true;
    await collector.command('run', { consent: { marketing: true } });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(getStateHold(collector.destinations.a)).toBeUndefined();
    expect(log.indexOf('b:push:page view')).toBeGreaterThan(-1);
    expect(log.indexOf('b:push:page view')).toBeLessThan(
      log.indexOf('a:on:end'),
    );
    expect(log.indexOf('a:push:page view')).toBeGreaterThan(
      log.indexOf('a:on:end'),
    );
  });
});

describe('no live delivery slips in between init and its flush', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  test('a consent command issued as soon as the destination reads initialized queues behind the older queued consent', async () => {
    const log: string[] = [];
    let probe: Promise<unknown> | undefined;
    const code: Destination.Instance = {
      type: 'probe',
      config: {},
      init: (context) => {
        const { collector } = context;
        // Watch every microtask from inside init(); the first tick in which
        // the destination reads initialized, issue a revoke.
        const watch = async () => {
          for (let tick = 0; tick < 1000; tick++) {
            await Promise.resolve();
            if (collector.destinations.d?.config.init) {
              probe = collector.command('consent', { marketing: false });
              return;
            }
          }
        };
        void watch();
        log.push('init');
      },
      push: (event: WalkerOS.Event) => {
        log.push(`push:${event.name}`);
      },
      on: (type, context) => {
        if (type !== 'consent') return;
        log.push(`start:consent:${JSON.stringify(context.data)}`);
      },
    };
    const { elb, collector } = await startFlow({
      destinations: { d: { code, config: { consent: { marketing: true } } } },
    });
    await elb('page view', {});
    await elb('walker consent', { marketing: true });
    await probe;
    const consents = log.filter((line) => line.startsWith('start:consent'));
    expect(consents).toEqual([
      'start:consent:{"marketing":true}',
      'start:consent:{"marketing":false}',
    ]);
    expect(vendorConsent(log)).toEqual(collector.consent);
  });
});

describe('a state command reports the events it delivers', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  test('events drained after the command flush appear in its push result', async () => {
    const log: string[] = [];
    const { elb, collector } = await startFlow({
      destinations: { d: asyncRecorder(log, () => sleep(10)) },
    });
    await elb('walker consent', { marketing: true });
    await elb('walker consent', { marketing: false });
    await elb('page view', {});
    expect(log).not.toContain('d:push:page view');
    const result = await collector.command('consent', { marketing: true });
    expect(log).toContain('d:push:page view');
    expect(result.ok).toBe(true);
    expect(result.done?.d).toBeDefined();
    expect(result.queued?.d).toBeUndefined();
  });
});
