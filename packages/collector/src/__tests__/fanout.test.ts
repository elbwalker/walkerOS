import type {
  Collector,
  Destination,
  Logger,
  Source,
  Transformer,
  WalkerOS,
} from '@walkeros/core';
import { startFlow } from '..';

/** The failure lines are asserted elsewhere; keep the output clean. */
const logger: Logger.Config = { handler: () => undefined };

/** Forks every event into two copies, `data.copy` 1 and 2. */
const fork: Transformer.Instance = {
  type: 'fork',
  config: {},
  push: (event) => [
    { event: { ...event, data: { copy: 1 } } },
    { event: { ...event, data: { copy: 2 } } },
  ],
};

/** Refuses copy 2, accepts the rest. */
function picky(delivered: WalkerOS.Event[]): Destination.Instance {
  return {
    type: 'picky',
    config: {},
    push: async (event) => {
      if (event.data.copy === 2) throw new Error('copy 2 refused');
      delivered.push(event);
    },
  };
}

const probe: Source.Init<
  Source.Types<unknown, unknown, Collector.PushFn>
> = async (context) => ({
  type: 'probe',
  config: context.config,
  push: context.env.push,
});

const throwing: Transformer.Instance = {
  type: 'broken',
  config: {},
  push: () => {
    throw new Error('transformer bug');
  },
};

const dropping: Transformer.Instance = {
  type: 'filter',
  config: {},
  push: () => false,
};

describe('fan-out reports every copy (C3)', () => {
  it.each<[string, (sink: Destination.Instance) => Collector.InitConfig]>([
    [
      'collector next',
      (sink) => ({
        logger,
        next: 'fork',
        transformers: { fork: { code: async () => fork } },
        destinations: { d: { code: sink } },
      }),
    ],
    [
      'source next',
      (sink) => ({
        logger,
        sources: { probe: { code: probe, next: 'fork' } },
        transformers: { fork: { code: async () => fork } },
        destinations: { d: { code: sink } },
      }),
    ],
    [
      'source before',
      (sink) => ({
        logger,
        sources: { probe: { code: probe, before: 'fork' } },
        transformers: { fork: { code: async () => fork } },
        destinations: { d: { code: sink } },
      }),
    ],
  ])('%s: a copy failing at a destination fails the push', async (_, init) => {
    const delivered: WalkerOS.Event[] = [];
    const { elb } = await startFlow(init(picky(delivered)));

    const r = await elb({ name: 'page view', data: {} });

    expect(delivered).toHaveLength(1);
    expect(r.ok).toBe(false);
    expect(r.failed?.d.reason?.message).toBe('copy 2 refused');
    expect(r.done?.d).toBeUndefined();
  });
});

describe('transformer errors are failures, drops are drops (C6)', () => {
  it('a throwing transformer fails the push with its reason, not dropped', async () => {
    const delivered: WalkerOS.Event[] = [];
    const { elb, collector } = await startFlow({
      logger,
      next: 'broken',
      transformers: { broken: { code: async () => throwing } },
      destinations: { d: { code: picky(delivered) } },
    });

    const r = await elb({ name: 'page view', data: {} });

    expect(r.ok).toBe(false);
    expect(r.dropped).toBeUndefined();
    expect(r.error).toContain('broken');
    expect(r.reason).toEqual({
      code: 'transformer',
      message: 'transformer bug',
      retryable: false,
    });
    expect(delivered).toHaveLength(0);
    expect(collector.status.failed).toBe(1);
  });

  it('a transformer returning false is a deliberate drop', async () => {
    const delivered: WalkerOS.Event[] = [];
    const { elb } = await startFlow({
      next: 'filter',
      transformers: { filter: { code: async () => dropping } },
      destinations: { d: { code: picky(delivered) } },
    });

    const r = await elb({ name: 'page view', data: {} });

    expect(r).toMatchObject({ ok: true, dropped: true });
    expect(r.reason).toBeUndefined();
    expect(delivered).toHaveLength(0);
  });
});
