// A mapping rule's `consent` holds at a destination: the rule is selected once,
// as the event enters the destination, and the event waits (web) or is
// skipped (server) until both the destination's and the rule's consent hold.
// Every case runs a real collector; only the destination is a probe.

import { FatalError, Level, isObject } from '@walkeros/core';
import type {
  Destination,
  FlowState,
  Logger,
  Mapping,
  Transformer,
  WalkerOS,
} from '@walkeros/core';
import { startFlow } from '..';
import { DestinationTimeoutError } from '../timeout';

type Pushed = {
  name: string;
  id: WalkerOS.Property | undefined;
  rule: string | undefined;
};

function probe(
  config: Destination.Config,
  extra: Partial<Destination.Instance> = {},
) {
  const pushed: Pushed[] = [];
  const code: Destination.Instance = {
    type: 'probe',
    config,
    ...extra,
    push: async (event, context) => {
      pushed.push({
        name: event.name,
        id: event.data.id,
        rule: context.rule?.name,
      });
    },
  };
  return { code, pushed };
}

function errorLines() {
  const errors: Array<{ message: string; context: Logger.LogContext }> = [];
  const logger: Logger.Config = {
    level: 'DEBUG',
    handler: (level, message, context) => {
      if (level === Level.ERROR) errors.push({ message, context });
    },
  };
  return { errors, logger };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** The `data` of the value a condition receives. */
function dataOf(value: unknown): WalkerOS.AnyObject {
  return isObject(value) && isObject(value.data) ? value.data : {};
}

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

const silent: Logger.Config = { handler: () => undefined };

// Conditions and timeouts here run on real time; test 26 fakes its own clock.
beforeEach(() => {
  jest.useRealTimers();
});

const ruleMarketing: Mapping.Rules = {
  order: { complete: { name: 'purchase', consent: { marketing: true } } },
};

it('1 holds a rule-denied event, records it, and replays it once in order', async () => {
  const states: FlowState[] = [];
  const { code, pushed } = probe({
    consent: { analytics: true },
    mapping: ruleMarketing,
  });
  const { collector, elb } = await startFlow({
    run: true,
    consent: { analytics: true },
    destinations: { probe: { code } },
  });
  collector.observers.add((state) => states.push(state));
  await elb('order complete', { id: 'o1' });
  await elb('page view', { id: 'p1' });
  const held = await elb('order complete', { id: 'o2' });
  expect(pushed.map((p) => p.id)).toEqual(['p1']);
  expect(held.queued?.probe).toBeDefined();
  const skip = states.find(
    (s) => s.phase === 'skip' && s.skipReason === 'consent',
  );
  expect(skip?.meta).toEqual({ required: { marketing: true } });
  expect(skip?.mappingKey).toBe('order complete');
  await elb('walker consent', { marketing: true });
  expect(pushed.map((p) => [p.id, p.rule])).toEqual([
    ['p1', undefined],
    ['o1', 'purchase'],
    ['o2', 'purchase'],
  ]);
});

it.each<
  [WalkerOS.Consent | undefined, WalkerOS.Consent, WalkerOS.Consent, boolean]
>([
  [
    { analytics: true },
    { marketing: true },
    { analytics: true, marketing: true },
    true,
  ],
  [{ analytics: true }, { marketing: true }, { analytics: true }, false],
  [{ analytics: true }, { marketing: true }, { marketing: true }, false],
  [undefined, { marketing: true }, {}, false],
  [
    { analytics: true, functional: true },
    { marketing: true, ads: true },
    { functional: true, ads: true },
    true,
  ],
])(
  '2 destination %j and rule %j under %j: delivered %s',
  async (dest, rule, state, delivered) => {
    const { code, pushed } = probe({
      consent: dest,
      mapping: { order: { complete: { consent: rule } } },
    });
    const { elb } = await startFlow({
      run: true,
      consent: state,
      destinations: { probe: { code } },
    });
    await elb('order complete', { id: 'o1' });
    expect(pushed.length > 0).toBe(delivered);
  },
);

it('3 a destination consent denial keeps its record', async () => {
  const states: FlowState[] = [];
  const { code } = probe({
    consent: { analytics: true },
    mapping: ruleMarketing,
  });
  const { collector, elb } = await startFlow({
    run: true,
    consent: {},
    destinations: { probe: { code } },
  });
  collector.observers.add((state) => states.push(state));
  await elb('order complete', { id: 'o1' });
  const skip = states.find(
    (s) => s.phase === 'skip' && s.skipReason === 'consent',
  );
  expect(skip?.meta).toEqual({ required: { analytics: true } });
  expect(skip?.mappingKey).toBeUndefined();
});

it('4 skips a rule-denied event under consentDenied skip and counts it', async () => {
  const { code, pushed } = probe({ mapping: ruleMarketing });
  const { collector, elb } = await startFlow({
    run: true,
    consentDenied: 'skip',
    destinations: { probe: { code } },
  });
  const result = await elb('order complete', { id: 'o1' });
  expect(result.ok).toBe(true);
  expect(result.queued).toBeUndefined();
  expect(collector.status.destinations.probe.skipped).toBe(1);
  expect(collector.destinations.probe.queuePush ?? []).toEqual([]);
  await elb('walker consent', { marketing: true });
  expect(pushed).toEqual([]);
});

it('5 runs a condition once per event, never per pass', async () => {
  const condition = jest.fn(() => true);
  const { code } = probe({
    mapping: {
      order: {
        complete: {
          name: 'purchase',
          consent: { marketing: true },
          condition,
        },
      },
    },
  });
  const { elb } = await startFlow({
    run: true,
    destinations: { probe: { code } },
  });
  await elb('order complete', { id: 'o1' });
  await elb('page view', { id: 'p1' });
  await elb('page view', { id: 'p2' });
  expect(condition).toHaveBeenCalledTimes(1);
});

it('6 selects no rule for an event the destination does not admit', async () => {
  const condition = jest.fn(() => true);
  const { code, pushed } = probe({
    consent: { analytics: true },
    mapping: { order: { complete: { name: 'purchase', condition } } },
  });
  const { elb } = await startFlow({
    run: true,
    consent: {},
    destinations: { probe: { code } },
  });
  await elb('order complete', { id: 'o1' });
  expect(condition).not.toHaveBeenCalled();
  await elb('walker consent', { analytics: true });
  expect(condition).toHaveBeenCalledTimes(1);
  expect(pushed.map((p) => p.id)).toEqual(['o1']);
});

it('7 an ignore rule needs no consent', async () => {
  const states: FlowState[] = [];
  const { code, pushed } = probe({
    mapping: {
      order: { complete: { ignore: true, consent: { marketing: true } } },
    },
  });
  const { collector, elb } = await startFlow({
    run: true,
    destinations: { probe: { code } },
  });
  collector.observers.add((state) => states.push(state));
  await elb('order complete', { id: 'o1' });
  expect(states.some((s) => s.skipReason === 'consent')).toBe(false);
  expect(collector.destinations.probe.queuePush ?? []).toEqual([]);
  expect(pushed).toEqual([]);
});

it('8 batches a rule-denied event under its rule once granted', async () => {
  const keys: string[] = [];
  const { code } = probe(
    {
      mapping: {
        order: { complete: { batch: 0, consent: { marketing: true } } },
      },
    },
    {
      pushBatch: async (batch) => {
        keys.push(batch.key);
      },
    },
  );
  const { collector, elb } = await startFlow({
    run: true,
    destinations: { probe: { code } },
  });
  await elb('order complete', { id: 'o1' });
  expect(collector.destinations.probe.batches).toBeUndefined();
  await elb('walker consent', { marketing: true });
  await tick(10);
  expect(keys).toEqual(['order complete']);
});

it('9 writes the cache marker once, after delivery', async () => {
  const { code, pushed } = probe({ mapping: ruleMarketing });
  const { elb } = await startFlow({
    run: true,
    destinations: {
      probe: {
        code,
        cache: { stop: true, rules: [{ key: ['event.name'], ttl: 60 }] },
      },
    },
  });
  await elb('order complete', { id: 'o1' });
  await elb('walker consent', { marketing: true });
  expect(pushed).toHaveLength(1);
  await elb('order complete', { id: 'o2' });
  expect(pushed).toHaveLength(1);
});

describe('10 a before rename onto another rule', () => {
  const forkRenamed = (to: string): Transformer.InitTransformers[string] => ({
    code: async (context): Promise<Transformer.Instance> => ({
      type: 'fork',
      config: context.config,
      push: async (event) => [
        { event: { ...event } },
        { event: { ...event, name: to } },
      ],
    }),
  });

  async function renamed(mapping: Mapping.Rules, to: string) {
    const { errors, logger } = errorLines();
    const { code, pushed } = probe({ mapping });
    const { elb } = await startFlow({
      run: true,
      consent: {},
      logger,
      transformers: { fork: forkRenamed(to) },
      destinations: { probe: { code, before: ['fork'] } },
    });
    await elb('order complete', { id: 'o1' });
    return {
      pushed,
      lines: errors.filter((e) => e.context.code === 'rule-not-applied'),
    };
  }

  it('logs one ERROR naming the carried rule, and nothing otherwise', async () => {
    const mapping: Mapping.Rules = {
      order: { complete: { name: 'purchase' } },
      product: { purchase: { name: 'item', consent: { marketing: true } } },
    };
    const onto = await renamed(mapping, 'product purchase');
    expect(onto.pushed.map((p) => p.rule)).toEqual(['purchase', 'purchase']);
    expect(onto.lines).toHaveLength(1);
    expect(onto.lines[0].context.mappingKey).toBe('order complete');
    expect(onto.lines[0].message).not.toContain('counted in status');

    expect((await renamed(mapping, 'other thing')).lines).toHaveLength(0);
    expect(
      (await renamed({ order: { '*': { name: 'o' } } }, 'order cancel')).lines,
    ).toHaveLength(0);
    // Selected at `* *` by fallthrough: the new name's first candidate is
    // `* *` too, compared with the carried key, not a fresh lookup.
    const fallthrough: Mapping.Rules = {
      order: { complete: { condition: () => false, name: 'vip' } },
      '*': { '*': { name: 'all' } },
    };
    expect((await renamed(fallthrough, 'order completed')).lines).toHaveLength(
      0,
    );
  });
});

it('11 arriving selections overlap and keep admission order', async () => {
  let inFlight = 0;
  let max = 0;
  const condition: Mapping.Condition = async (value) => {
    inFlight++;
    max = Math.max(max, inFlight);
    await tick(Number(dataOf(value).wait));
    inFlight--;
    return true;
  };
  const { code, pushed } = probe({
    mapping: {
      order: {
        complete: {
          name: 'purchase',
          consent: { marketing: true },
          condition,
        },
      },
    },
  });
  const { elb } = await startFlow({
    run: true,
    destinations: { probe: { code } },
  });
  await Promise.all([
    elb('order complete', { id: 'a', wait: 30 }),
    elb('order complete', { id: 'b', wait: 10 }),
    elb('order complete', { id: 'c', wait: 20 }),
  ]);
  expect(max).toBe(3);
  await elb('walker consent', { marketing: true });
  expect(pushed.map((p) => p.id)).toEqual(['b', 'c', 'a']);
});

it('12 a grant drains the queued entries before later arrivals, each once', async () => {
  const condition: Mapping.Condition = async () => {
    await tick(5);
    return true;
  };
  const { code, pushed } = probe({
    consent: { analytics: true },
    mapping: { order: { complete: { name: 'purchase', condition } } },
  });
  const { elb } = await startFlow({
    run: true,
    consent: {},
    destinations: { probe: { code } },
  });
  for (const id of ['q1', 'q2', 'q3', 'q4', 'q5'])
    await elb('order complete', { id });
  const grant = elb('walker consent', { analytics: true });
  const arrivals = ['n1', 'n2', 'n3'].map((id) =>
    elb('order complete', { id }),
  );
  await Promise.all([grant, ...arrivals]);
  expect(pushed.slice(0, 5).map((p) => p.id)).toEqual([
    'q1',
    'q2',
    'q3',
    'q4',
    'q5',
  ]);
  expect(pushed).toHaveLength(8);
  expect(new Set(pushed.map((p) => p.id)).size).toBe(8);
});

describe('13 a failing condition fails only its own event', () => {
  const throwing: Mapping.Condition = (value) => {
    if (dataOf(value).bad) throw new Error('boom');
    return true;
  };
  const rejecting: Mapping.Condition = async (value) => {
    if (dataOf(value).bad) throw new Error('boom');
    return true;
  };

  it.each<[string, Mapping.Condition]>([
    ['throwing', throwing],
    ['rejecting', rejecting],
  ])('%s, while queued', async (_label, condition) => {
    const { errors, logger } = errorLines();
    const { code, pushed } = probe({
      consent: { analytics: true },
      mapping: { order: { complete: { condition } } },
    });
    const { collector, elb } = await startFlow({
      run: true,
      consent: {},
      logger,
      destinations: { probe: { code } },
    });
    await elb('order complete', { id: 'e1' });
    await elb('order complete', { id: 'bad', bad: true, email: 'a@b.c' });
    await elb('order complete', { id: 'e3' });
    await elb('walker consent', { analytics: true });
    expect(pushed.map((p) => p.id)).toEqual(['e1', 'e3']);
    expect(collector.status.destinations.probe.failed).toBe(1);
    expect(collector.destinations.probe.dlq).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(JSON.stringify(errors)).not.toContain('a@b.c');
  });

  it('arriving: the push answers its failure, counted once', async () => {
    const { code } = probe({
      mapping: { order: { complete: { condition: throwing } } },
    });
    const { collector, elb } = await startFlow({
      run: true,
      logger: silent,
      destinations: { probe: { code } },
    });
    const result = await elb('order complete', { id: 'bad', bad: true });
    expect(result.ok).toBe(false);
    expect(result.failed?.probe.reason?.code).toBe('mapping');
    expect(collector.status.destinations.probe.failed).toBe(1);
  });
});

it('14 a FatalError in a queued selection propagates and keeps the queue', async () => {
  const condition: Mapping.Condition = (value) => {
    if (dataOf(value).bad) throw new FatalError('stop');
    return true;
  };
  const { code } = probe({
    consent: { analytics: true },
    mapping: { order: { complete: { condition } } },
  });
  const { collector, elb } = await startFlow({
    run: true,
    consent: {},
    logger: silent,
    destinations: { probe: { code } },
  });
  await elb('order complete', { id: 'e1' });
  await elb('order complete', { id: 'bad', bad: true });
  await elb('order complete', { id: 'e3' });
  await expect(elb('walker consent', { analytics: true })).rejects.toThrow(
    'stop',
  );
  expect(collector.destinations.probe.queuePush).toHaveLength(3);
});

it('15 a hung condition fails timeout, writes no late match, opens no breaker', async () => {
  const hung = deferred<boolean>();
  const { code, pushed } = probe({
    timeout: 20,
    breaker: 1,
    mapping: {
      order: { complete: { name: 'purchase', condition: () => hung.promise } },
    },
  });
  const { collector, elb } = await startFlow({
    run: true,
    logger: silent,
    destinations: { probe: { code } },
  });
  const result = await elb('order complete', { id: 'o1' });
  expect(result.ok).toBe(false);
  expect(result.failed?.probe.reason?.code).toBe('timeout');
  expect(collector.destinations.probe.dlq?.[0][1]).toBeInstanceOf(
    DestinationTimeoutError,
  );
  hung.resolve(true);
  await tick(5);
  expect(pushed).toEqual([]);
  await elb('page view', { id: 'p1' });
  expect(pushed.map((p) => p.id)).toEqual(['p1']);
});

/** Tests 16 and 17: `e1`'s queued selection awaits `slow` while a grant runs. */
async function slowQueuedSelection() {
  const { errors, logger } = errorLines();
  const called = deferred<void>();
  const slow = deferred<boolean>();
  const userStarted = deferred<void>();
  const userGate = deferred<void>();
  const condition: Mapping.Condition = (value) => {
    if (dataOf(value).id !== 'e1') return true;
    called.resolve();
    return slow.promise;
  };
  const { code } = probe(
    {
      consent: { analytics: true },
      queueMax: 2,
      mapping: { order: { complete: { condition } } },
    },
    {
      init: async () => {},
      on: async (type) => {
        if (type === 'user') {
          userStarted.resolve();
          await userGate.promise;
        }
      },
    },
  );
  const { collector, elb } = await startFlow({
    run: true,
    consent: { analytics: true },
    logger,
    destinations: { probe: { code } },
  });
  await elb('page view', { id: 'p0' }); // init
  await elb('walker consent', { analytics: false });
  await elb('order complete', { id: 'e1' });
  await elb('order complete', { id: 'e2' });
  const grant = elb('walker consent', { analytics: true });
  await called.promise;
  return { collector, elb, errors, grant, slow, userStarted, userGate };
}

it('16 a selection failing after drop-oldest evicted its entry is not reported', async () => {
  const { collector, elb, errors, grant, slow, userStarted, userGate } =
    await slowQueuedSelection();
  const user = elb('walker user', { id: 'u1' });
  await userStarted.promise; // the state delivery runs: the destination is held
  await elb('page view', { id: 'e3' }); // held, evicts e1
  slow.reject(new Error('late'));
  userGate.resolve();
  await Promise.all([grant, user]);
  expect(collector.status.destinations.probe.failed ?? 0).toBe(0);
  expect(collector.destinations.probe.dlq ?? []).toEqual([]);
  expect(errors.filter((e) => e.context.code === 'mapping')).toEqual([]);
  expect(collector.status.dropped['destination.probe']?.queue).toBe(1);
});

it('17 a selection failing after walker run cleared its entry is not reported', async () => {
  const { collector, elb, grant, slow } = await slowQueuedSelection();
  const run = elb('walker run');
  await tick(0); // the queue reset is synchronous; the run's flush waits
  slow.reject(new Error('late'));
  await Promise.all([run, grant]);
  expect(collector.status.destinations.probe.failed ?? 0).toBe(0);
  expect(collector.destinations.probe.dlq ?? []).toEqual([]);
});

it('18 a condition pushing to its own destination fails timeout; the inner push is delivered', async () => {
  const { errors, logger } = errorLines();
  const ref: {
    push?: (name: string, data: WalkerOS.Properties) => Promise<unknown>;
  } = {};
  const condition: Mapping.Condition = async () => {
    await ref.push?.('page view', { id: 'inner' });
    return true;
  };
  const { code, pushed } = probe({
    consent: { analytics: true },
    timeout: 30,
    mapping: { order: { complete: { name: 'purchase', condition } } },
  });
  const { elb } = await startFlow({
    run: true,
    consent: {},
    logger,
    destinations: { probe: { code } },
  });
  ref.push = elb;
  await elb('order complete', { id: 'o1' });
  await elb('walker consent', { analytics: true });
  await tick(5);
  expect(errors.filter((e) => e.context.code === 'timeout')).toHaveLength(1);
  expect(pushed.map((p) => p.id)).toEqual(['inner']);
});

it('19 a mapping installed by init re-selects, so its rule consent applies', async () => {
  const { code, pushed } = probe(
    { mapping: { order: { complete: { name: 'registered' } } } },
    {
      init: async ({ config }) => ({
        ...config,
        mapping: {
          order: {
            complete: { name: 'installed', consent: { marketing: true } },
          },
        },
      }),
    },
  );
  const { elb } = await startFlow({
    run: true,
    consent: { analytics: true },
    destinations: { probe: { code } },
  });
  await elb('order complete', { id: 'o1' });
  expect(pushed).toEqual([]);
  await elb('walker consent', { marketing: true });
  expect(pushed.map((p) => [p.id, p.rule])).toEqual([['o1', 'installed']]);
});

it('20 never inits a destination for rule-denied events only', async () => {
  const init = jest.fn();
  const { code, pushed } = probe({ mapping: ruleMarketing }, { init });
  const { elb } = await startFlow({
    run: true,
    destinations: { probe: { code } },
  });
  await elb('order complete', { id: 'o1' });
  await elb('order complete', { id: 'o2' });
  expect(init).not.toHaveBeenCalled();
  await elb('page view', { id: 'p1' });
  expect(init).toHaveBeenCalledTimes(1);
  expect(pushed.map((p) => p.id)).toEqual(['p1']);
  await elb('walker consent', { marketing: true });
  expect(pushed.map((p) => p.id)).toEqual(['p1', 'o1', 'o2']);
});

it('21 a consent change during init re-gates the rule consent', async () => {
  const gate = deferred<void>();
  const { code, pushed } = probe(
    { mapping: ruleMarketing },
    {
      init: async () => {
        await gate.promise;
      },
    },
  );
  const { collector, elb } = await startFlow({
    run: true,
    consent: { marketing: true },
    destinations: { probe: { code } },
  });
  const first = elb('order complete', { id: 'o1' });
  await tick(0); // the push is in its init
  const revoke = elb('walker consent', { marketing: false });
  await tick(0);
  gate.resolve();
  await Promise.all([first, revoke]);
  expect(pushed).toEqual([]);
  expect(
    (collector.destinations.probe.queuePush ?? []).map((e) => e.event.data.id),
  ).toEqual(['o1']);
});

it('22 a consent revoked during an arriving selection holds the event with its selection', async () => {
  const called = deferred<void>();
  const slow = deferred<boolean>();
  const condition = jest.fn(() => {
    called.resolve();
    return slow.promise;
  });
  const { code, pushed } = probe({
    mapping: {
      order: {
        complete: {
          name: 'purchase',
          consent: { marketing: true },
          condition,
        },
      },
    },
  });
  const { elb } = await startFlow({
    run: true,
    consent: { marketing: true },
    destinations: { probe: { code } },
  });
  const first = elb('order complete', { id: 'o1' });
  await called.promise; // the arriving selection awaits
  await elb('walker consent', { marketing: false });
  slow.resolve(true);
  await first;
  expect(pushed).toEqual([]);
  await elb('walker consent', { marketing: true });
  expect(pushed.map((p) => [p.id, p.rule])).toEqual([['o1', 'purchase']]);
  expect(condition).toHaveBeenCalledTimes(1);
});

it('23 a consent granted during an arriving selection keeps queue order', async () => {
  const slow = deferred<boolean>();
  const condition: Mapping.Condition = () => slow.promise;
  const { code, pushed } = probe({
    consent: { analytics: true },
    mapping: { order: { complete: { name: 'purchase', condition } } },
  });
  const { elb } = await startFlow({
    run: true,
    consent: {},
    destinations: { probe: { code } },
  });
  await elb('order complete', { id: 'q1' });
  const a1 = elb({
    name: 'order complete',
    data: { id: 'a1' },
    consent: { analytics: true },
  });
  const grant = elb('walker consent', { analytics: true });
  slow.resolve(true);
  await Promise.all([grant, a1]);
  expect(pushed.map((p) => p.id)).toEqual(['q1', 'a1']);
});

it('24 consent comes first while the breaker is open', async () => {
  const code: Destination.Instance = {
    type: 'probe',
    config: { breaker: 1, mapping: ruleMarketing },
    push: async (event) => {
      if (event.name === 'page view') throw new Error('down');
    },
  };
  const { elb } = await startFlow({
    run: true,
    logger: silent,
    destinations: { probe: { code } },
  });
  await elb('page view', { id: 'p1' });
  const result = await elb('order complete', { id: 'o1' });
  expect(result.queued?.probe.reason?.code).toBe('consent');
  expect(result.failed?.probe).toBeUndefined();
});

it('25 an entry drained during an init keeps its identity', async () => {
  const states: FlowState[] = [];
  const gate = deferred<void>();
  const { code } = probe(
    { mapping: ruleMarketing },
    {
      init: async () => {
        await gate.promise;
      },
    },
  );
  const { collector, elb } = await startFlow({
    run: true,
    destinations: { probe: { code } },
  });
  collector.observers.add((state) => states.push(state));
  await elb('order complete', { id: 'd0' }); // queued, no init
  const p1 = elb('page view', { id: 'p1' }); // allowed, starts init
  const p2 = elb('page view', { id: 'p2' }); // drains d0 and requeues it during init
  await tick(0);
  gate.resolve();
  await Promise.all([p1, p2]);
  const skips = states.filter(
    (s) => s.phase === 'skip' && s.skipReason === 'consent',
  );
  expect(skips).toHaveLength(3);
});

describe('26 held entries keep their own consent through selection', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it.each<['skip' | 'queue']>([['skip'], ['queue']])(
    'consentDenied %s',
    async (mode) => {
      jest.useFakeTimers({ now: 1_000_000 });
      const { errors, logger } = errorLines();
      const condition = jest.fn(() => true);
      let userSyncDown = true;
      const { code, pushed } = probe(
        {
          consent: { marketing: true },
          timeout: 1000,
          mapping: { a: { one: { name: 'held-rule', condition } } },
        },
        {
          on: (type) => {
            if (type === 'user' && userSyncDown)
              throw new Error('user sync down');
          },
        },
      );
      const { collector, elb } = await startFlow({
        consentDenied: mode,
        consent: { marketing: true },
        logger,
        destinations: { probe: { code } },
      });
      await elb('page view', { id: 'p1' });
      await elb('walker user', { id: 'u1' }); // on(user) throws: held
      const held = await elb('a one', { id: 'a1' });
      expect(held.queued?.probe.reason?.code).toBe('held');
      await elb('walker consent', { marketing: false });
      userSyncDown = false;
      jest.setSystemTime(1_000_000 + 1001);
      await elb('b two');
      expect(pushed.map((p) => [p.id, p.rule])).toEqual([
        ['p1', undefined],
        ['a1', 'held-rule'],
      ]);
      expect(condition).toHaveBeenCalledTimes(1);
      expect(errors.filter((e) => e.context.code === 'mapping')).toEqual([]);
      if (mode === 'skip')
        expect(collector.status.destinations.probe.skipped).toBe(1);
    },
  );
});

it('27 a push waiting behind an init answers its own selection failure', async () => {
  const { errors, logger } = errorLines();
  const gate = deferred<void>();
  const { code, pushed } = probe(
    { mapping: { order: { complete: { name: 'registered' } } } },
    {
      init: async ({ config }) => {
        await gate.promise;
        return {
          ...config,
          mapping: {
            order: {
              complete: {
                condition: () => {
                  throw new Error('boom');
                },
              },
            },
          },
        };
      },
    },
  );
  const { collector, elb } = await startFlow({
    run: true,
    logger,
    destinations: { probe: { code } },
  });
  const first = elb('page view', { id: 'p1' }); // starts init
  const second = elb('order complete', { id: 'o1' }); // waits behind it
  await tick(0);
  gate.resolve();
  const [, result] = await Promise.all([first, second]);
  expect(result.ok).toBe(false);
  expect(result.failed?.probe.reason?.code).toBe('mapping');
  expect(collector.status.destinations.probe.failed).toBe(1);
  expect(errors.filter((e) => e.context.code === 'mapping')).toHaveLength(1);
  expect(pushed.map((p) => p.id)).toEqual(['p1']);
});

it('28 a state hold that starts while the init owner re-selects holds its events', async () => {
  const called = deferred<void>();
  const slow = deferred<boolean>();
  const userStarted = deferred<void>();
  const userGate = deferred<void>();
  let pushedWhenUserSettled: number | undefined;
  const ref: { pushed: Pushed[] } = { pushed: [] };
  const { code, pushed } = probe(
    { mapping: { order: { complete: { name: 'registered' } } } },
    {
      init: async ({ config }) => ({
        ...config,
        mapping: {
          order: {
            complete: {
              name: 'installed',
              condition: async () => {
                called.resolve();
                await slow.promise;
                return true;
              },
            },
          },
        },
      }),
      on: async (type) => {
        if (type !== 'user') return;
        userStarted.resolve();
        await userGate.promise;
        pushedWhenUserSettled = ref.pushed.length;
      },
    },
  );
  ref.pushed = pushed;
  const { elb } = await startFlow({
    run: true,
    destinations: { probe: { code } },
  });
  let answer: Awaited<ReturnType<typeof elb>> | undefined;
  const first = elb('order complete', { id: 'o1' }).then((result) => {
    answer = result;
    return result;
  });
  await called.promise; // init ran, the installed rule is being selected
  const user = elb('walker user', { id: 'u1' });
  await userStarted.promise;
  slow.resolve(true);
  await tick(0);
  expect(pushed).toEqual([]);
  expect(answer?.queued?.probe.reason?.code).toBe('held');
  userGate.resolve();
  await Promise.all([first, user]);
  expect(pushed.map((p) => [p.id, p.rule])).toEqual([['o1', 'installed']]);
  expect(pushedWhenUserSettled).toBe(0);
});

it('29 a mapping installed by init keeps the consent each event was admitted with', async () => {
  const { code, pushed } = probe(
    {
      consent: { marketing: true },
      mapping: { order: { complete: { name: 'registered' } } },
    },
    {
      init: async ({ config }) => ({
        ...config,
        mapping: { order: { complete: { name: 'installed' } } },
      }),
    },
  );
  const { collector, elb } = await startFlow({
    run: true,
    consentDenied: 'skip',
    consent: {},
    destinations: { probe: { code } },
  });
  await elb({
    name: 'order complete',
    data: { id: 'o1' },
    consent: { marketing: true },
  });
  expect(pushed.map((p) => [p.id, p.rule])).toEqual([['o1', 'installed']]);
  expect(collector.status.destinations.probe.skipped ?? 0).toBe(0);
});

describe('30 an event that carries its own consent keeps it through a selection await', () => {
  async function run(race: boolean) {
    const called = deferred<void>();
    const gate = deferred<void>();
    const received: WalkerOS.Consent[] = [];
    const code: Destination.Instance = {
      type: 'probe',
      config: {
        mapping: {
          order: {
            complete: {
              name: 'purchase',
              consent: { marketing: true },
              condition: async () => {
                called.resolve();
                await gate.promise;
                return true;
              },
            },
          },
        },
      },
      push: async (event) => {
        received.push(event.consent);
      },
    };
    const { collector, elb } = await startFlow({
      run: true,
      consentDenied: 'skip',
      consent: { marketing: true },
      destinations: { probe: { code } },
    });
    const pushed = elb({
      name: 'order complete',
      data: { id: 'o1' },
      consent: { marketing: false },
    });
    await called.promise; // the arriving selection awaits
    if (race) await elb('walker consent', { functional: true });
    gate.resolve();
    const answer = await pushed;
    const skipped = collector.status.destinations.probe.skipped ?? 0;
    return { answer, received, skipped };
  }

  it.each<[boolean]>([[false], [true]])(
    'consent command during the await: %s',
    async (race) => {
      const { answer, received, skipped } = await run(race);
      expect(answer.ok).toBe(true);
      expect(received).toEqual([]);
      expect(skipped).toBe(1);
    },
  );
});
