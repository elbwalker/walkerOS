/**
 * What the status counters say on a real collector: delivered events, the
 * time and latency a delivery took, skips by reason, and drops by position.
 */
import type { Collector, Destination, Transformer } from '@walkeros/core';
import { startFlow } from '..';

const event = { name: 'page view', data: {} };

function sink(
  push: Destination.PushFn = () => undefined,
): Destination.Instance {
  return { type: 'sink', config: {}, push };
}

/** A before-chain step that fans every event into three children. */
const forkIntoThree: Transformer.InitTransformers[string] = {
  code: async (context): Promise<Transformer.Instance> => ({
    type: 'fork',
    config: context.config,
    push: async (event) =>
      [0, 1, 2].map((child) => ({
        event: { ...event, data: { ...event.data, child } },
      })),
  }),
};

/** Twelve latency counts with one event in bucket `index`. */
function oneIn(index: number): number[] {
  const counts = new Array<number>(12).fill(0);
  counts[index] = 1;
  return counts;
}

describe('destination counters', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('counts every consent-released event on a sync destination', async () => {
    const { collector, elb } = await startFlow({
      destinations: {
        d: { code: sink(), config: { consent: { marketing: true } } },
      },
    });
    for (let i = 0; i < 20; i++) await elb(event);

    await elb('walker consent', { marketing: true });

    expect(collector.status.destinations.d.count).toBe(20);
    expect(collector.status.out).toBe(20);
  });

  it('adds a batched flush to duration once and to one latency bucket', async () => {
    jest.useFakeTimers({ now: 1_000_000 });
    const { collector, elb } = await startFlow({
      destinations: {
        b: {
          code: {
            type: 'batched',
            config: {},
            push: () => undefined,
            pushBatch: () => {
              jest.advanceTimersByTime(40);
            },
          },
          config: { batch: { wait: 1000 } },
        },
      },
    });
    await elb(event);
    await elb(event);

    await elb('walker flush');

    const status = collector.status.destinations.b;
    expect(status.count).toBe(2);
    expect(status.duration).toBe(40);
    // 40 ms is at most 50 ms, the fourth bound.
    expect(status.latency).toEqual(oneIn(3));
  });

  it.each([
    [
      'a delivered',
      () => {
        jest.advanceTimersByTime(7);
      },
    ],
    [
      'a failed',
      () => {
        jest.advanceTimersByTime(7);
        throw new Error('vendor down');
      },
    ],
  ])('%s sync push records its latency', async (_name, push) => {
    jest.useFakeTimers({ now: 1_000_000 });
    const { collector, elb } = await startFlow({
      destinations: { d: { code: sink(push) } },
    });

    await elb(event);

    // 7 ms is at most 10 ms, the second bound.
    expect(collector.status.destinations.d.latency).toEqual(oneIn(1));
  });

  it.each([
    ['a consent skip', 'skipped', { consent: { marketing: true } }],
    [
      'a rule ignore',
      'ignored',
      { mapping: { page: { view: { ignore: true } } } },
    ],
  ] as const)('counts %s in %s only', async (_name, field, config) => {
    const { collector, elb } = await startFlow({
      consentDenied: 'skip',
      destinations: { d: { code: sink(), config } },
    });

    await elb(event);

    const status = collector.status.destinations.d;
    const other = field === 'skipped' ? 'ignored' : 'skipped';
    expect(status[field]).toBe(1);
    expect(status[other]).toBeUndefined();
  });
});

// A before chain that fans one event into three hands the destination three
// events, and every one it delivered counts, synchronously or batched, also
// beside a child that failed.
describe('before-chain fan-out', () => {
  const batched: Destination.Instance = {
    type: 'batched',
    config: {},
    push: () => undefined,
    pushBatch: () => undefined,
  };
  const refusesThird = sink((event) => {
    if (event.data.child === 2) throw new Error('child 2 refused');
  });

  it.each([
    ['a sync destination', sink(), {}, 3, 0],
    ['a batched destination', batched, { batch: { wait: 1000 } }, 3, 0],
    ['a sync destination refusing one child', refusesThird, {}, 2, 1],
  ])(
    'counts every delivered child on %s',
    async (_name, code, config, count, failed) => {
      const { collector, elb } = await startFlow({
        transformers: { fork: forkIntoThree },
        destinations: { d: { code, config, before: ['fork'] } },
      });

      await elb(event);
      await elb('walker flush');

      const status = collector.status.destinations.d;
      expect(status.count).toBe(count);
      expect(status.failed).toBe(failed);
      expect(collector.status.out).toBe(count);
    },
  );
});

describe('collector drops', () => {
  it.each([
    [
      'a collector.next stop',
      { next: [{ stop: true }] },
      undefined,
      'collector.next',
      'stopped',
    ],
    [
      'a source consent drop',
      {},
      { id: 's', mapping: { consent: { marketing: true } } },
      'source.s',
      'consent',
    ],
    [
      'a source ignore',
      {},
      { id: 's', mapping: { mapping: { page: { view: { ignore: true } } } } },
      'source.s',
      'ignored',
    ],
  ] satisfies Array<
    [
      string,
      Collector.InitConfig,
      Parameters<Collector.PushFn>[1],
      string,
      'stopped' | 'consent' | 'ignored',
    ]
  >)('counts %s at its position', async (_name, init, options, at, counter) => {
    const { collector } = await startFlow({
      ...init,
      destinations: { d: { code: sink() } },
    });

    await collector.push(event, options);

    expect(collector.status.dropped[at]).toEqual({ [counter]: 1 });
  });
});
