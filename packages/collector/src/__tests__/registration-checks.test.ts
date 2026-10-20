import { Level } from '@walkeros/core';
import type {
  Collector,
  Destination,
  Logger,
  Source,
  Transformer,
  WalkerOS,
} from '@walkeros/core';
import { startFlow } from '..';

function errors() {
  const lines: string[] = [];
  const logger: Logger.Config = {
    handler: (level, message) => {
      if (level === Level.ERROR) lines.push(message);
    },
  };
  return { lines, logger };
}

function sink(delivered: WalkerOS.Event[]): Destination.Instance {
  return {
    type: 'sink',
    config: {},
    push: async (event) => void delivered.push(event),
  };
}

const probe: Source.Init<
  Source.Types<unknown, unknown, Collector.PushFn>
> = async (context) => ({
  type: 'probe',
  config: context.config,
  push: context.env.push,
});

const pass: Transformer.Instance = {
  type: 'pass',
  config: {},
  push: (event) => ({ event }),
};

afterEach(() => {
  globalThis.__WALKEROS_VALIDATE__ = undefined;
});

describe('registration checks', () => {
  it('(E3) a batch on a destination without pushBatch is one ERROR at registration', async () => {
    const { lines, logger } = errors();
    const delivered: WalkerOS.Event[] = [];
    const { elb } = await startFlow({
      logger,
      destinations: {
        d: { code: sink(delivered), config: { batch: { wait: 100 } } },
      },
    });
    expect(lines).toEqual([
      'Destination d: `config.batch` has no effect: the destination has no pushBatch, so events go to push one by one',
    ]);

    await elb('page view');
    await elb('page view');
    expect(lines).toHaveLength(1);
    expect(delivered).toHaveLength(2);
  });

  it('an unknown transformer in a chain is one ERROR at registration, never per event', async () => {
    const { lines, logger } = errors();
    const delivered: WalkerOS.Event[] = [];
    const { elb } = await startFlow({
      logger,
      next: ['missing', 'pass'],
      transformers: { pass: { code: async () => pass } },
      destinations: { d: { code: sink(delivered) } },
    });
    expect(lines).toEqual([
      'Transformer not found: missing (named in collector.next); the chain goes on without it',
    ]);

    await elb('page view');
    await elb('page view');
    expect(lines).toHaveLength(1);
    expect(delivered).toHaveLength(2);
  });
});

describe('mapping keys with no effect at their position (D4)', () => {
  it('a destination rule extend and a source rule data: one ERROR each, both still run', async () => {
    const { lines, logger } = errors();
    const delivered: WalkerOS.Event[] = [];
    const { elb } = await startFlow({
      logger,
      sources: {
        probe: {
          code: probe,
          config: {
            mapping: { page: { view: { data: { map: { id: 'data.id' } } } } },
          },
        },
      },
      destinations: {
        d: {
          code: sink(delivered),
          config: {
            mapping: { page: { view: { name: 'pv', extend: { name: 'x' } } } },
          },
        },
      },
    });

    expect(lines).toEqual([
      "Destination d: `config.mapping.page.view.extend` does nothing at the destination position; a rule's `extend` is merged only by a package onto its own shipped rules; write the fields on the rule itself.",
      "Source probe: `config.mapping.page.view.data` does nothing at the source position; only `consent`, `policy` and a rule's `condition`, `policy`, `name` and `ignore` apply.",
    ]);

    await elb({ name: 'page view', data: { id: 1 } });
    expect(delivered).toHaveLength(1);
    expect(delivered[0].name).toBe('pv');
  });

  it('a transformer no-op keeps its text and is now an ERROR', async () => {
    const { lines, logger } = errors();
    await startFlow({
      logger,
      transformers: {
        t: { config: { mapping: { data: 'data' } } },
      },
    });
    expect(lines).toEqual([
      "Transformer t: `config.mapping.data` does nothing at the transformer position; only `policy` and a rule's `condition`, `policy`, `name` and `ignore` apply.",
    ]);
  });

  it('with __WALKEROS_VALIDATE__ false nothing is checked', async () => {
    globalThis.__WALKEROS_VALIDATE__ = false;
    const { lines, logger } = errors();
    await startFlow({
      logger,
      sources: {
        probe: {
          code: probe,
          config: { mapping: { page: { view: { data: 'data' } } } },
        },
      },
      transformers: { t: { config: { mapping: { data: 'data' } } } },
      destinations: {
        d: {
          code: sink([]),
          config: { mapping: { page: { view: { extend: { name: 'x' } } } } },
        },
      },
    });
    expect(lines).toEqual([]);
  });
});
