import type { Destination, WalkerOS } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { startFlow } from '..';
import { getStateHold } from '../on';

function recorder(
  log: string[],
  config: Destination.Config = { consent: { marketing: true } },
  // Lifecycle types are noise in an ordering test about state: every
  // destination initialized before the collector broadcasts `run` records a
  // live `on:run`, which is correct behaviour and would appear in most
  // expectations below without saying anything about consent. The tests that
  // do assert lifecycle delivery pass `true` and record every type.
  lifecycle = false,
): Destination.Init {
  const code: Destination.Instance = {
    type: 'recorder',
    config: {},
    init: () => {
      log.push('init');
    },
    push: (event: WalkerOS.Event) => {
      log.push(`push:${event.name}`);
    },
    on: (type, context) => {
      const stateCell =
        type === 'consent' ||
        type === 'user' ||
        type === 'globals' ||
        type === 'custom';
      if (!stateCell && !lifecycle) return;
      const data = context.data;
      log.push(
        data === undefined
          ? `on:${type}`
          : `on:${type}:${JSON.stringify(data)}`,
      );
    },
  };
  return { code, config };
}

const GRANT = 'on:consent:{"marketing":true}';
const count = (log: string[], entry: string) =>
  log.filter((line) => line === entry).length;

describe('destination state delivery: deferral and the run barrier', () => {
  test('a pre-run consent command is deferred: no queueOn entry, no mark, nothing delivered', async () => {
    const log: string[] = [];
    const { collector } = await startFlow({
      run: false,
      destinations: { rec: recorder(log) },
    });
    await collector.command('consent', { marketing: true });
    const rec = collector.destinations.rec;
    expect(log).toEqual([]);
    expect(rec.queueOn ?? []).toEqual([]);
    expect(collector.delivery.get(rec)).toBeUndefined();
  });

  test('the run barrier delivers the deferred consent once, before the first push', async () => {
    const log: string[] = [];
    const { elb, collector } = await startFlow({
      run: false,
      destinations: { rec: recorder(log) },
    });
    await collector.command('consent', { marketing: true });
    await collector.command('run');
    await elb('page view', {});
    expect(log).toEqual(['init', GRANT, 'push:page view']);
    expect(collector.delivery.get(collector.destinations.rec)?.consent).toBe(
      collector.cellVersion.consent,
    );
  });

  test('denied then granted before run delivers the granted snapshot once at run', async () => {
    const log: string[] = [];
    const { elb, collector } = await startFlow({
      run: false,
      destinations: { rec: recorder(log) },
    });
    await collector.command('consent', { marketing: false });
    await collector.command('consent', { marketing: true });
    await collector.command('run');
    await elb('page view', {});
    expect(log).toEqual(['init', GRANT, 'push:page view']);
  });

  test('a second walker run does not re-deliver state a destination already received', async () => {
    const log: string[] = [];
    const { elb, collector } = await startFlow({
      destinations: { rec: recorder(log) },
    });
    await elb('walker consent', { marketing: true });
    await collector.command('run');
    await collector.command('run');
    expect(count(log, GRANT)).toBe(1);
  });

  test('a live consent command after run reaches an initialized destination exactly once', async () => {
    const log: string[] = [];
    const { elb } = await startFlow({
      destinations: { rec: recorder(log) },
    });
    await elb('walker consent', { marketing: true });
    await elb('walker consent', { marketing: true });
    expect(count(log, GRANT)).toBe(2);
  });

  test('lifecycle deliveries stay unconditional: on(run) is queued before init and flushed at init', async () => {
    const log: string[] = [];
    const { elb } = await startFlow({
      destinations: { rec: recorder(log, {}, true) },
    });
    await elb('page view', {});
    expect(log).toEqual(['init', 'on:run', 'push:page view']);
  });

  test('a destination without on() gets no queueOn entries and no mark', async () => {
    const push = jest.fn();
    const { elb, collector } = await startFlow({
      destinations: { plain: { code: { type: 'plain', config: {}, push } } },
    });
    await elb('walker consent', { marketing: true });
    expect(collector.destinations.plain.queueOn).toBeUndefined();
    expect(
      collector.delivery.get(collector.destinations.plain),
    ).toBeUndefined();
  });

  test('a destination whose on(consent) re-emits consent is stopped by the cascade bound and logged once', async () => {
    const seen: number[] = [];
    const logger = createMockLogger();
    const code: Destination.Instance = {
      type: 'loop',
      config: { init: true },
      push: () => undefined,
      on: async (type, context) => {
        if (type !== 'consent') return;
        seen.push(seen.length);
        await context.collector.command('consent', { marketing: true });
      },
    };
    const { collector } = await startFlow({
      destinations: { loop: { code, config: { init: true } } },
    });
    Object.assign(collector, { logger });
    await collector.command('consent', { marketing: true });
    expect(seen.length).toBeLessThanOrEqual(9);
    expect(logger.error).toHaveBeenCalledWith(
      'state delivery did not converge',
      { type: 'consent' },
    );
  });
});

describe('destination state delivery: activation catch-up', () => {
  test('activation while dormant is delivery-inert; the run barrier delivers once', async () => {
    const log: string[] = [];
    const { elb, collector } = await startFlow({
      run: false,
      destinations: {
        rec: recorder(log, {
          consent: { marketing: true },
          require: ['consent'],
        }),
      },
    });
    await collector.command('consent', { marketing: true });
    expect(collector.destinations.rec).toBeDefined();
    expect(log).toEqual([]);
    expect(collector.destinations.rec.queueOn ?? []).toEqual([]);
    await collector.command('run');
    await elb('page view', {});
    expect(log).toEqual(['init', GRANT, 'push:page view']);
  });

  test('catch-up delivers every present cell as a snapshot, in cell order, and no lifecycle type', async () => {
    const log: string[] = [];
    const { elb } = await startFlow({});
    await elb('walker consent', { marketing: true });
    await elb('walker user', { id: 'u1' });
    await elb('walker globals', { g: 1 });
    await elb('walker custom', { c: 1 });
    // `true`: this test asserts that NO lifecycle type is replayed, which the
    // state-only default would satisfy for free and prove nothing.
    await elb('walker destination', recorder(log, { id: 'rec' }, true));
    expect(log).toEqual([
      'init',
      GRANT,
      'on:user:{"id":"u1"}',
      'on:globals:{"g":1}',
      'on:custom:{"c":1}',
    ]);
  });

  test('a runtime destination with require already satisfied catches up before its first push', async () => {
    const log: string[] = [];
    const { elb } = await startFlow({ consent: { marketing: true } });
    await elb('page view', {});
    await elb(
      'walker destination',
      recorder(log, {
        id: 'rec',
        consent: { marketing: true },
        require: ['consent'],
      }),
    );
    expect(log).toEqual(['init', GRANT, 'push:page view']);
  });

  test('catch-up does not double-deliver: a startup require destination activated at startup receives the initial consent once', async () => {
    const log: string[] = [];
    const { elb } = await startFlow({
      consent: { marketing: true },
      destinations: {
        rec: recorder(log, {
          consent: { marketing: true },
          require: ['consent'],
        }),
      },
    });
    await elb('page view', {});
    expect(count(log, GRANT)).toBe(1);
  });

  test('multiple steps: two destinations and a require-gated source all see the consent before any push', async () => {
    const a: string[] = [];
    const b: string[] = [];
    const sourceOn = jest.fn();
    // With a source in the flow `elb` routes to that source's push, so the
    // event and the command go through the collector directly.
    const { collector } = await startFlow({
      sources: {
        dep: {
          code: async (ctx) => ({
            type: 'dep',
            config: {},
            push: ctx.env.push,
            on: sourceOn,
          }),
          config: { require: ['consent'] },
        },
      },
      destinations: {
        gated: recorder(
          a,
          { consent: { marketing: true }, require: ['consent'] },
          true,
        ),
        open: recorder(b, { consent: { marketing: true } }, true),
      },
    });
    await collector.push({ name: 'page view' });
    await collector.command('consent', { marketing: true });
    // The gated destination was pending at run, so it never sees on('run')
    // (decision D5); the open one had it queued at startup and flushed at init.
    expect(a).toEqual(['init', GRANT, 'push:page view']);
    expect(b).toEqual(['init', 'on:run', GRANT, 'push:page view']);
    expect(sourceOn).toHaveBeenCalledWith('consent', { marketing: true });
  });

  test('walker run clears the consent-denied queue but keeps a queued on() delivery', async () => {
    const log: string[] = [];
    const { elb, collector } = await startFlow({
      destinations: { rec: recorder(log) },
    });
    await elb('page view', {});
    expect(collector.destinations.rec.queuePush).toHaveLength(1);
    await collector.command('run');
    expect(collector.destinations.rec.queuePush).toEqual([]);
    expect(collector.destinations.rec.queueOn).toEqual([
      { type: 'run', data: undefined },
      { type: 'run', data: undefined },
    ]);
    expect(log).toEqual([]);
  });

  test('require on a lifecycle type: a destination gated on run activates at run and catches up the consent', async () => {
    const log: string[] = [];
    const { elb, collector } = await startFlow({
      run: false,
      destinations: {
        rec: recorder(log, { consent: { marketing: true }, require: ['run'] }),
      },
    });
    await collector.command('consent', { marketing: true });
    expect(collector.destinations.rec).toBeUndefined();
    await collector.command('run');
    await elb('page view', {});
    expect(log).toEqual(['init', GRANT, 'push:page view']);
  });
});

describe('destination state delivery: no destination stays held, no unseen content is marked', () => {
  test('a static global at the construction version reaches on() and the destination is not held', async () => {
    const log: string[] = [];
    const { elb, collector } = await startFlow({
      globalsStatic: { site: 'a' },
      destinations: { rec: recorder(log, {}) },
    });
    await elb('walker consent', { marketing: true });
    await elb('page view', {});
    expect(getStateHold(collector.destinations.rec)).toBeUndefined();
    expect(log).toEqual([
      'init',
      'on:globals:{"site":"a"}',
      GRANT,
      'push:page view',
    ]);
  });

  test('a cell merged from the run state reaches an initialized destination and does not hold it', async () => {
    const log: string[] = [];
    const { elb, collector } = await startFlow({
      destinations: { rec: recorder(log, {}) },
    });
    await elb('page view', {});
    await collector.command('run', { user: { id: 'u1' } });
    await elb('walker consent', { marketing: true });
    await elb('page view', {});
    expect(getStateHold(collector.destinations.rec)).toBeUndefined();
    expect(log).toEqual([
      'init',
      'push:page view',
      'on:user:{"id":"u1"}',
      GRANT,
      'push:page view',
    ]);
  });

  test('a runtime destination receives the consent recorded before it, then the next delta, and is not held', async () => {
    const log: string[] = [];
    const { elb, collector } = await startFlow({
      consent: { marketing: true },
    });
    await elb('walker destination', recorder(log, { id: 'rec' }));
    await elb('walker consent', { functional: true });
    await elb('page view', {});
    expect(getStateHold(collector.destinations.rec)).toBeUndefined();
    expect(log).toEqual([
      'init',
      GRANT,
      'on:consent:{"functional":true}',
      'push:page view',
    ]);
  });
});

describe('destination state delivery: owed state is delivered before a push', () => {
  test('during walker run, the consent passed with run reaches an initialized destination before an event a starting source pushes', async () => {
    jest.useRealTimers();
    const log: string[] = [];
    let push: ((event: { name: string }) => unknown) | undefined;
    const { collector } = await startFlow({
      sources: {
        // Starts at the run barrier, once the run's consent satisfies its
        // require, and pushes on the queued `run` like a browser source.
        late: {
          code: async () => ({
            type: 'late',
            config: {},
            push: jest.fn(),
            on: (type: string) => {
              if (type === 'run' && push) void push({ name: 'page view' });
            },
          }),
          config: { require: ['consent'] },
        },
      },
      destinations: { rec: recorder(log, {}) },
    });
    push = (event) => collector.push(event);
    await collector.push({ name: 'page view' });
    log.length = 0;
    await collector.command('run', { consent: { marketing: true } });
    // Let the push the source started settle.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(log.indexOf(GRANT)).toBeGreaterThan(-1);
    expect(log.indexOf('push:page view')).toBeGreaterThan(log.indexOf(GRANT));
    expect(count(log, GRANT)).toBe(1);
  });
});

describe('destination state delivery: the cascade bound before and during init', () => {
  test('the bound holds during an init flush when an unrelated command that opened the cascade finishes mid-flush', async () => {
    const seen: number[] = [];
    const logger = createMockLogger();
    let releaseUser: () => void = () => undefined;
    const userGate = new Promise<void>((resolve) => {
      releaseUser = resolve;
    });
    const code: Destination.Instance = {
      type: 'loop',
      config: {},
      init: () => undefined,
      push: () => undefined,
      on: async (type, context) => {
        if (type !== 'consent') return;
        seen.push(seen.length);
        // The unrelated command finishes while this flush is still running.
        if (seen.length === 1) releaseUser();
        if (seen.length > 50) return;
        await context.collector.command('consent', { functional: true });
      },
    };
    const { collector } = await startFlow({
      sources: {
        slow: {
          code: async () => ({
            type: 'slow',
            config: {},
            push: jest.fn(),
            on: async (type: string) => {
              if (type === 'user') await userGate;
            },
          }),
        },
      },
      destinations: {
        loop: { code, config: { consent: { marketing: true } } },
      },
    });
    await collector.command('consent', { functional: true });
    Object.assign(collector, { logger });
    // Opens the cascade and stays inside it until the flush has started.
    const unrelated = collector.command('user', { id: 'u1' });
    await collector.push({ name: 'page view', consent: { marketing: true } });
    await unrelated;
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.length).toBeLessThanOrEqual(10);
    expect(logger.error).toHaveBeenCalledWith(
      'state delivery did not converge',
      { type: 'consent' },
    );
  });

  test('a delivery the cascade bound skips before init is queued as the whole cell, and the destination still initializes and sends', async () => {
    const log: string[] = [];
    const { collector } = await startFlow({
      logger: { handler: () => undefined },
      destinations: { rec: recorder(log) },
    });
    const rec = collector.destinations.rec;
    // A cascade in which this destination already reached the bound.
    collector.cascade = { counts: new WeakMap([[rec, { consent: 8 }]]) };
    await collector.command('consent', { marketing: true });
    collector.cascade = undefined;
    await collector.push({ name: 'page view' });
    expect(getStateHold(rec)).toBeUndefined();
    expect(log).toEqual(['init', GRANT, 'push:page view']);
  });

  test('a handler that re-emits consent during an init flush started by a push is stopped by the cascade bound', async () => {
    const seen: number[] = [];
    const logger = createMockLogger();
    const code: Destination.Instance = {
      type: 'loop',
      config: {},
      init: () => undefined,
      push: () => undefined,
      on: async (type, context) => {
        if (type !== 'consent') return;
        seen.push(seen.length);
        if (seen.length > 50) return;
        await context.collector.command('consent', { functional: true });
      },
    };
    const { collector } = await startFlow({
      destinations: {
        loop: { code, config: { consent: { marketing: true } } },
      },
    });
    // Queued while the destination waits for marketing consent.
    await collector.command('consent', { functional: true });
    expect(seen).toEqual([]);
    Object.assign(collector, { logger });
    // The event carries its own grant, so it initializes the destination
    // outside any state command.
    await collector.push({ name: 'page view', consent: { marketing: true } });
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.length).toBeLessThanOrEqual(10);
    expect(logger.error).toHaveBeenCalledWith(
      'state delivery did not converge',
      { type: 'consent' },
    );
  });
});

describe('destination state delivery: state assigned without a command', () => {
  test('a runtime destination without on() receives the queued event once, with the assigned state', async () => {
    const push = jest.fn();
    const { elb, collector } = await startFlow({});
    await elb('page view', {});
    collector.consent = { demo: true };
    collector.user = { id: 'u1' };
    collector.globals = { foo: 'bar' };
    const result = await elb('walker destination', {
      code: { type: 'plain', config: {}, push },
      config: { id: 'later' },
    });
    expect(result.done?.later).toBeDefined();
    expect(push).toHaveBeenCalledTimes(1);
    expect(push.mock.calls[0][0]).toEqual(
      // A queued event takes the current consent and user at push; its
      // globals stay those it was created with.
      expect.objectContaining({
        consent: { demo: true },
        user: { id: 'u1' },
      }),
    );
  });

  test('a runtime destination with on() receives the assigned state, then the queued event once', async () => {
    const log: string[] = [];
    const { elb, collector } = await startFlow({});
    await elb('page view', {});
    collector.consent = { demo: true };
    collector.user = { id: 'u1' };
    collector.globals = { foo: 'bar' };
    await elb('walker destination', recorder(log, { id: 'later' }));
    expect(getStateHold(collector.destinations.later)).toBeUndefined();
    expect(log).toEqual([
      'init',
      'on:consent:{"demo":true}',
      'on:user:{"id":"u1"}',
      'on:globals:{"foo":"bar"}',
      'push:page view',
    ]);
  });
});

describe('destination state delivery: a runtime add overlapping a state command', () => {
  test('an un-awaited walker destination and a consent command init the destination once, consent before any event', async () => {
    const log: string[] = [];
    const { elb } = await startFlow({});
    await elb('page view', {});
    const add = elb('walker destination', recorder(log, { id: 'rec' }));
    await elb('walker consent', { marketing: true });
    await add;
    expect(count(log, 'init')).toBe(1);
    expect(log).toEqual(['init', GRANT, 'push:page view']);
  });
});

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

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

describe('destination state delivery: held destination retry', () => {
  // The package's jest setup installs fake timers before each test; the
  // retry window is measured in real time.
  beforeEach(() => {
    jest.useRealTimers();
  });

  test('a held destination retries its owed state at the next push and recovers', async () => {
    const log: string[] = [];
    let calls = 0;
    const { elb, collector } = await startFlow({
      destinations: {
        d: asyncRecorder(
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
    expect(getStateHold(collector.destinations.d)).toBeDefined();

    // No further state command: the next event alone must recover it.
    await sleep(30);
    await elb('order complete', {});
    expect(getStateHold(collector.destinations.d)).toBeUndefined();
    expect(log).toContain('d:push:page view');
    expect(log).toContain('d:push:order complete');
  });

  test('a delivery suppressed by the cascade bound holds the destination until the owed cell is delivered', async () => {
    const log: string[] = [];
    const { elb, collector } = await startFlow({
      logger: { handler: () => undefined },
      destinations: {
        d: asyncRecorder(log, () => Promise.resolve(), { timeout: 20 }),
      },
    });
    await elb('page view', {});
    const d = collector.destinations.d;
    // A cascade in which this destination already reached the bound.
    collector.cascade = { counts: new WeakMap([[d, { consent: 8 }]]) };
    await collector.command('consent', { marketing: true });
    collector.cascade = undefined;
    expect(log).not.toContain('d:on:start');
    expect(getStateHold(d)?.type).toBe('consent');

    await elb('order complete', {});
    expect(log).not.toContain('d:push:order complete');

    await sleep(30);
    await elb('order view', {});
    expect(getStateHold(d)).toBeUndefined();
    expect(log).toEqual([
      'd:init',
      'd:push:page view',
      'd:on:start',
      'd:on:end',
      'd:push:order complete',
      'd:push:order view',
    ]);
  });
});
