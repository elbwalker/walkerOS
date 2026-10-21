import { Level } from '@walkeros/core';
import type {
  Collector,
  Destination,
  Logger,
  Mapping,
  Source,
} from '@walkeros/core';
import { startFlow } from '..';

function errors() {
  const lines: Array<{ message: string; context: Logger.LogContext }> = [];
  const logger: Logger.Config = {
    handler: (level, message, context) => {
      if (level === Level.ERROR) lines.push({ message, context });
    },
  };
  return { lines, logger };
}

const broken: Mapping.Condition = () => {
  throw new Error('condition bug');
};

const probe: Source.Init<
  Source.Types<unknown, unknown, Collector.PushFn>
> = async (context) => ({
  type: 'probe',
  config: context.config,
  push: context.env.push,
});

describe('mapping failures (ruling 2)', () => {
  it('(a) a throwing rule condition fails the destination, never falls through', async () => {
    const { lines, logger } = errors();
    const push = jest.fn();
    const { elb, collector } = await startFlow({
      logger,
      destinations: {
        d: {
          code: { type: 'probe', config: {}, push },
          config: {
            mapping: {
              order: {
                complete: [
                  { condition: broken, ignore: true },
                  { name: 'purchase' },
                ],
              },
            },
          },
        },
      },
    });

    const r = await elb('order complete', { email: 'person@example.com' });

    expect(r.ok).toBe(false);
    expect(r.failed?.d.reason).toMatchObject({
      code: 'mapping',
      retryable: false,
    });
    expect(push).not.toHaveBeenCalled();
    expect(collector.status.destinations.d.failed).toBe(1);
    expect(lines).toHaveLength(1);
    expect(JSON.stringify(lines)).not.toContain('person@example.com');
  });

  it('(a) a throwing rule condition at a source fails the push with reason mapping', async () => {
    const { logger } = errors();
    const push = jest.fn();
    const { elb } = await startFlow({
      logger,
      sources: {
        probe: {
          code: probe,
          config: { mapping: { order: { complete: { condition: broken } } } },
        },
      },
      destinations: { d: { code: { type: 'probe', config: {}, push } } },
    });

    const r = await elb({ name: 'order complete', data: {} });

    expect(r.ok).toBe(false);
    expect(r.reason).toMatchObject({ code: 'mapping', retryable: false });
    expect(push).not.toHaveBeenCalled();
  });

  it('(b, c, d) a throwing fn and an operator-less value drop the value only: delivered, reported, no payload', async () => {
    const { lines, logger } = errors();
    const received: unknown[] = [];
    const order: Record<string, string> = { total: 'data.value' };
    const destination: Destination.Instance = {
      type: 'probe',
      config: {},
      push: (_event, context) => void received.push(context.data),
    };
    const { elb, collector } = await startFlow({
      logger,
      destinations: {
        d: {
          code: destination,
          config: {
            mapping: {
              order: {
                complete: {
                  data: {
                    map: {
                      order,
                      currency: 'data.currency',
                      broken: {
                        fn: () => {
                          throw new Error('fn bug');
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const r = await elb('order complete', {
      value: 42,
      currency: 'EUR',
      email: 'person@example.com',
    });

    expect(r.ok).toBe(true);
    expect(received).toEqual([{ currency: 'EUR' }]);
    expect(collector.status.failed).toBe(0);
    expect(lines.map((line) => line.context)).toEqual([
      expect.objectContaining({
        step: 'mapping.order complete',
        code: 'mapping',
        event: 'order complete',
        mappingKey: 'order complete',
      }),
    ]);
    expect(lines[0].message).toContain('mapping value has no operator (total)');
    expect(JSON.stringify(lines)).not.toContain('person@example.com');
  });

  it('value problems in two rules give two lines, one per rule', async () => {
    const { lines, logger } = errors();
    const operatorLess: Record<string, string> = { from: 'data.value' };
    const destination: Destination.Instance = {
      type: 'probe',
      config: {},
      push: jest.fn(),
    };
    const { elb } = await startFlow({
      logger,
      destinations: {
        d: {
          code: destination,
          config: {
            mapping: {
              order: { complete: { data: { map: { total: operatorLess } } } },
              page: { view: { data: { map: { title: operatorLess } } } },
            },
          },
        },
      },
    });

    await elb('order complete', { value: 42 });
    await elb('page view', { title: 'Home' });

    expect(lines.map((line) => line.context.step)).toEqual([
      'mapping.order complete',
      'mapping.page view',
    ]);
  });
});
