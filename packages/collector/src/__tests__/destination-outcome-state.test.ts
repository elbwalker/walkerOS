import { assembleJourneys, Level } from '@walkeros/core';
import type {
  Collector,
  Destination,
  FlowState,
  Logger,
  Source,
  WalkerOS,
} from '@walkeros/core';
import { startFlow } from '..';

type Line = { level: Level; message: string; context: Logger.LogContext };

/** Every log line at every level, through the logger's one handler. */
function capture() {
  const lines: Line[] = [];
  const logger: Logger.Config = {
    level: 'DEBUG',
    handler: (level, message, context) => {
      lines.push({ level, message, context });
    },
  };
  const at = (level: Level) => lines.filter((line) => line.level === level);
  return { lines, logger, at };
}

function observe() {
  const states: FlowState[] = [];
  return { states, observer: (state: FlowState) => void states.push(state) };
}

describe('destination states, consent first', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('(a) a consent-denied event on a breaker-open destination waits for consent, never fails', async () => {
    const { at, logger } = capture();
    const push = jest.fn(async () => {
      throw new Error('down');
    });
    const { elb, collector } = await startFlow({
      logger,
      consent: { marketing: true },
      destinations: {
        d: {
          code: {
            type: 'probe',
            config: {
              consent: { marketing: true },
              breaker: { threshold: 1, cooldown: 60_000 },
            },
            push,
          },
        },
      },
    });
    await elb('page view');
    expect(collector.status.breakers['destination.d'].state).toBe('open');
    const errorsBefore = at(Level.ERROR).length;

    await elb('walker consent', { marketing: false });
    const r = await elb('page view');

    expect(r.ok).toBe(true);
    expect(r.failed).toBeUndefined();
    expect(r.queued?.d.reason).toEqual({
      code: 'consent',
      message: 'required consent is not granted',
    });
    expect(collector.destinations.d.dlq).toHaveLength(1);
    expect(collector.status.destinations.d.failed).toBe(1);
    expect(at(Level.ERROR)).toHaveLength(errorsBefore);
  });

  it('(b) consentDenied skip: counted, DEBUG, Observe skip, nothing queued, ok without queued', async () => {
    const { at, logger } = capture();
    const { states, observer } = observe();
    const push = jest.fn();
    const { elb, collector } = await startFlow({
      logger,
      consentDenied: 'skip',
      observers: [observer],
      destinations: {
        d: {
          code: {
            type: 'probe',
            config: { consent: { marketing: true } },
            push,
          },
        },
      },
    });

    const r = await elb('page view');

    expect(r).toMatchObject({ ok: true });
    expect(r.queued).toBeUndefined();
    expect(push).not.toHaveBeenCalled();
    expect(collector.destinations.d.queuePush ?? []).toHaveLength(0);
    expect(collector.status.destinations.d.skipped).toBe(1);
    expect(
      at(Level.DEBUG).some(
        (line) =>
          line.message === 'event skipped' && line.context.reason === 'consent',
      ),
    ).toBe(true);
    expect(
      states.some(
        (state) =>
          state.stepId === 'destination.d' &&
          state.phase === 'skip' &&
          state.skipReason === 'consent',
      ),
    ).toBe(true);
    expect(at(Level.ERROR)).toHaveLength(0);
    expect(at(Level.WARN)).toHaveLength(0);
  });

  it('(c) a failed on(consent) holds within one window, then blocks', async () => {
    jest.useFakeTimers({ now: 1_000_000 });
    const push = jest.fn();
    const dest: Destination.Instance = {
      type: 'probe',
      config: { timeout: 1000 },
      on: (type) => {
        if (type === 'consent') throw new Error('vendor gone');
      },
      push,
    };
    const { states, observer } = observe();
    const { logger } = capture();
    const { elb, collector } = await startFlow({
      logger,
      observers: [observer],
      destinations: { d: { code: dest } },
    });
    await elb('walker consent', { marketing: true });

    const held = await elb('page view');
    expect(held.queued?.d.reason).toEqual({
      code: 'held',
      message: 'a state delivery to the destination is running or failed',
    });
    expect(held.failed).toBeUndefined();
    expect(
      states.some(
        (state) => state.phase === 'skip' && state.skipReason === 'held',
      ),
    ).toBe(true);

    jest.setSystemTime(1_000_000 + 1001);
    const blocked = await elb('page view');
    expect(blocked.ok).toBe(false);
    expect(blocked.failed?.d.reason?.code).toBe('blocked');
    // The held event and this one fail; nothing parks for the page lifetime.
    expect(collector.status.destinations.d.failed).toBe(2);
    expect(collector.destinations.d.dlq).toHaveLength(2);
    expect(collector.destinations.d.queuePush ?? []).toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
  });

  it('(d) breaker open: every event in the cooldown fails breaker-open, counted, one line', async () => {
    const { at, logger } = capture();
    const push = jest.fn(async () => {
      throw new Error('down');
    });
    const { elb, collector } = await startFlow({
      logger,
      destinations: {
        d: {
          code: {
            type: 'probe',
            config: { breaker: { threshold: 2, cooldown: 60_000 } },
            push,
          },
        },
      },
    });
    await elb('page view');
    await elb('page view');
    const results = [
      await elb('page view'),
      await elb('page view'),
      await elb('page view'),
    ];

    expect(push).toHaveBeenCalledTimes(2);
    for (const r of results) {
      expect(r.ok).toBe(false);
      expect(r.failed?.d.reason).toMatchObject({
        code: 'breaker-open',
        retryable: true,
      });
    }
    expect(collector.status.destinations.d.failed).toBe(5);
    expect(collector.destinations.d.dlq).toHaveLength(5);
    const codes = at(Level.ERROR).map((line) => line.context.code);
    expect(codes).toEqual(['transport', 'breaker-open']);
  });

  it('(e) held overflow evicts consent waits first, then refuses the newest held event', async () => {
    const { at, logger } = capture();
    const push = jest.fn();
    const dest: Destination.Instance = {
      type: 'probe',
      config: { consent: { marketing: true }, queueMax: 2, timeout: 60_000 },
      on: (type) => {
        if (type === 'user') throw new Error('user sync down');
      },
      push,
    };
    const { elb, collector } = await startFlow({
      logger,
      consent: { marketing: true },
      destinations: { d: { code: dest } },
    });
    await elb('page view'); // initialized and delivered
    await elb('walker user', { id: 'u1' }); // on(user) throws: held
    await elb('walker consent', { marketing: false });
    await elb('page view'); // consent wait
    await elb('page view'); // consent wait
    await elb('walker consent', { marketing: true });
    expect(
      (collector.destinations.d.queuePush ?? []).map((entry) => entry.reason),
    ).toEqual(['consent', 'consent']);

    const first = await elb('page view');
    const second = await elb('page view');
    expect(first.queued?.d.reason?.code).toBe('held');
    expect(second.queued?.d.reason?.code).toBe('held');
    expect(
      (collector.destinations.d.queuePush ?? []).map((entry) => entry.reason),
    ).toEqual(['held', 'held']);
    expect(collector.status.dropped['destination.d'].queue).toBe(2);

    const refused = await elb('page view');
    expect(refused.ok).toBe(false);
    expect(refused.failed?.d.reason?.code).toBe('queue-full');
    expect(at(Level.ERROR).map((line) => line.context.code)).toContain(
      'queue-full',
    );

    // A new consent wait never evicts a held event: it is the one dropped.
    await elb('walker consent', { marketing: false });
    const denied = await elb('page view');
    expect(denied.queued?.d.reason?.code).toBe('consent');
    expect(
      (collector.destinations.d.queuePush ?? []).map((entry) => entry.reason),
    ).toEqual(['held', 'held']);
    expect(collector.status.dropped['destination.d'].queue).toBe(3);
    // Consent evictions are never above DEBUG.
    expect(
      at(Level.WARN).filter((line) => line.message.includes('queuePush')),
    ).toHaveLength(0);
  });

  it('(e) consent-only overflow keeps its bound: oldest dropped, DEBUG once, ok unchanged', async () => {
    const { at, logger } = capture();
    const { elb, collector } = await startFlow({
      logger,
      destinations: {
        d: {
          code: {
            type: 'probe',
            config: { consent: { marketing: true }, queueMax: 2 },
            push: jest.fn(),
          },
        },
      },
    });
    const results = [
      await elb('page view'),
      await elb('page view'),
      await elb('page view'),
      await elb('page view'),
    ];
    for (const r of results) {
      expect(r.ok).toBe(true);
      expect(r.queued?.d.reason?.code).toBe('consent');
    }
    expect(collector.destinations.d.queuePush).toHaveLength(2);
    expect(collector.status.dropped['destination.d'].queue).toBe(2);
    const overflow = at(Level.DEBUG).filter((line) =>
      line.message.startsWith('destination.queuePush overflow'),
    );
    expect(overflow).toHaveLength(1);
    expect(at(Level.WARN)).toHaveLength(0);
    expect(at(Level.ERROR)).toHaveLength(0);
  });

  it('(f) a throwing on(consent) is consent-not-applied; a throwing on(user) stays on callback failed', async () => {
    const { at, logger } = capture();
    const failingOn =
      (failing: string): Destination.Instance['on'] =>
      (type) => {
        if (type === failing) throw new Error('handler broke');
      };
    const dest: Destination.Instance = {
      type: 'probe',
      config: {},
      on: failingOn('consent'),
      push: jest.fn(),
    };
    const { elb } = await startFlow({
      logger,
      destinations: { d: { code: dest } },
    });
    await elb('page view'); // initializes the destination
    await elb('walker consent', { marketing: true });

    const consentLines = at(Level.ERROR);
    expect(consentLines).toHaveLength(1);
    expect(consentLines[0].context).toMatchObject({
      step: 'destination.d',
      code: 'consent-not-applied',
    });
    expect(
      consentLines.some((line) => line.message === 'on callback failed'),
    ).toBe(false);

    const { at: atUser, logger: userLogger } = capture();
    const { elb: elbUser } = await startFlow({
      logger: userLogger,
      destinations: { d: { code: { ...dest, on: failingOn('user') } } },
    });
    await elbUser('page view');
    await elbUser('walker user', { id: 'u1' });
    expect(atUser(Level.ERROR).map((line) => line.message)).toContain(
      'on callback failed',
    );
  });

  it('(g) a batched event waits with reason batch and keeps its batched out; a held event emits skip held', async () => {
    const { logger } = capture();
    const { states, observer } = observe();
    const pushBatch = jest.fn();
    const held: Destination.Instance = {
      type: 'held',
      config: { timeout: 60_000 },
      on: (type) => {
        if (type === 'consent') throw new Error('vendor gone');
      },
      push: jest.fn(),
    };
    const { elb } = await startFlow({
      logger,
      observers: [observer],
      destinations: {
        d: {
          code: {
            type: 'probe',
            config: { batch: { wait: 60_000 } },
            push: jest.fn(),
            pushBatch,
          },
        },
        h: { code: held },
      },
    });
    await elb('walker consent', { marketing: true }); // h is held from here

    const r = await elb('page view');

    expect(r.ok).toBe(true);
    expect(r.done).toBeUndefined();
    expect(r.queued?.d.reason).toEqual({
      code: 'batch',
      message: 'waiting in a batch window until it flushes',
    });
    expect(r.queued?.h.reason?.code).toBe('held');
    expect(pushBatch).not.toHaveBeenCalled();

    // Observe: the batch-stamped out stays the batch signal (no skip for a
    // batch); the held destination emits skip with reason held.
    const eventId = r.event?.id;
    const ofEvent = states.filter((state) => state.eventId === eventId);
    expect(
      ofEvent.some(
        (state) => state.stepId === 'destination.d' && state.phase === 'skip',
      ),
    ).toBe(false);
    expect(
      ofEvent.some(
        (state) =>
          state.stepId === 'destination.h' &&
          state.phase === 'skip' &&
          state.skipReason === 'held',
      ),
    ).toBe(true);
    const hopOf = () =>
      assembleJourneys(states)
        .journeys.find((journey) => journey.id === eventId)
        ?.hops.find((hop) => hop.stepId === 'destination.d');
    expect(hopOf()).toMatchObject({ terminalPhase: 'out', batched: true });

    await elb('walker flush');
    expect(pushBatch).toHaveBeenCalledTimes(1);
    expect(hopOf()).toMatchObject({ batched: true, flushConfirmed: true });
  });

  it('(h) an ignored event is a skip at a destination, not a delivery', async () => {
    const { at, logger } = capture();
    const { states, observer } = observe();
    const push = jest.fn();
    const { elb, collector } = await startFlow({
      logger,
      observers: [observer],
      destinations: {
        d: {
          code: { type: 'probe', config: {}, push },
          config: { mapping: { page: { view: { ignore: true } } } },
        },
      },
    });
    const outBefore = collector.status.out;

    const r = await elb('page view');

    expect(r.ok).toBe(true);
    expect(r.done).toBeUndefined();
    expect(push).not.toHaveBeenCalled();
    expect(collector.status.destinations.d.skipped).toBe(1);
    expect(collector.status.destinations.d.count).toBe(0);
    expect(collector.status.out).toBe(outBefore);
    expect(
      at(Level.DEBUG).filter(
        (line) =>
          line.message === 'event skipped' && line.context.reason === 'ignored',
      ),
    ).toHaveLength(1);
    expect(
      states.some(
        (state) =>
          state.stepId === 'destination.d' &&
          state.phase === 'skip' &&
          state.skipReason === 'ignored',
      ),
    ).toBe(true);
  });

  it('(h) an ignored event at a source answers dropped and is a collector drop', async () => {
    const { states, observer } = observe();
    const delivered: WalkerOS.Event[] = [];
    const probe: Source.Init<
      Source.Types<unknown, unknown, Collector.PushFn>
    > = async (context) => ({
      type: 'probe',
      config: context.config,
      push: context.env.push,
    });
    const { elb, collector } = await startFlow({
      observers: [observer],
      sources: {
        probe: {
          code: probe,
          config: { mapping: { page: { view: { ignore: true } } } },
        },
      },
      destinations: {
        d: {
          code: {
            type: 'sink',
            config: {},
            push: async (event) => void delivered.push(event),
          },
        },
      },
    });
    const inBefore = collector.status.in;

    const r = await elb({ name: 'page view' });

    expect(r).toEqual({ ok: true, dropped: true });
    expect(delivered).toHaveLength(0);
    expect(collector.status.in).toBe(inBefore + 1);
    expect(collector.status.out).toBe(0);
    const drop = states.find(
      (state) => state.stepId === 'collector.push' && state.phase === 'skip',
    );
    expect(drop?.skipReason).toBe('ignored');
    expect(drop?.meta).toEqual({ at: 'source.probe' });
  });
});
