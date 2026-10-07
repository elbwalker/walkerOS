import { startFlow } from '..';
import { Level } from '@walkeros/core';
import type { Logger, Mapping, WalkerOS } from '@walkeros/core';

/**
 * Task 4.1: runtime integration tests for the mapping-only transformer step.
 *
 * A transformer entry with `mapping` (and no `code`) synthesizes a
 * mapping-aware pass push at init: `processEventMapping` runs, the
 * transformed event flows on, and `ignore: true` drops the event.
 *
 * See `packages/collector/src/transformer.ts` (synthesized codeFn around the
 * "Synthesize a passthrough instance when `code` is absent" block).
 */
describe('mapping-only transformer steps', () => {
  it('runs a mapping-only transformer step (mapping field, no code)', async () => {
    const events: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      transformers: {
        redactEmail: {
          mapping: {
            policy: { 'user.email': { value: '[redacted]' } },
          },
        },
      },
      destinations: {
        capture: {
          before: ['redactEmail'],
          code: {
            type: 'capture',
            config: {},
            push: async (event: WalkerOS.Event) => {
              events.push(event);
            },
          },
        },
      },
    });

    await elb({
      name: 'page view',
      data: {},
      user: { email: 'alice@example.com' },
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ user: { email: '[redacted]' } });
  });

  it('drops events when a mapping-only step has ignore: true on the matching rule', async () => {
    const events: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      transformers: {
        dropDebug: {
          mapping: {
            mapping: { debug: { '*': [{ ignore: true }] } },
          },
        },
      },
      destinations: {
        capture: {
          before: ['dropDebug'],
          code: {
            type: 'capture',
            config: {},
            push: async (event: WalkerOS.Event) => {
              events.push(event);
            },
          },
        },
      },
    });

    await elb({ name: 'debug ping', data: {} });
    await elb({ name: 'page view', data: {} });

    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('page view');
  });

  it('renames events when mapping[].name is set', async () => {
    const events: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      transformers: {
        renamer: {
          mapping: {
            mapping: { order: { complete: { name: 'purchase' } } },
          },
        },
      },
      destinations: {
        capture: {
          before: ['renamer'],
          code: {
            type: 'capture',
            config: {},
            push: async (event: WalkerOS.Event) => {
              events.push(event);
            },
          },
        },
      },
    });

    await elb({ name: 'order complete', data: {} });

    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('purchase');
  });

  it('honours config.mapping, which wins over the step-level mapping', async () => {
    const events: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      transformers: {
        renamer: {
          config: {
            mapping: { mapping: { order: { complete: { name: 'purchase' } } } },
          },
          mapping: { mapping: { order: { complete: { name: 'step_level' } } } },
        },
      },
      destinations: {
        capture: {
          before: ['renamer'],
          code: {
            type: 'capture',
            config: {},
            push: async (event: WalkerOS.Event) => {
              events.push(event);
            },
          },
        },
      },
    });

    await elb({ name: 'order complete', data: {} });

    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('purchase');
  });
});

describe('transformer mapping init warnings', () => {
  function collectWarnings() {
    const warnings: string[] = [];
    const handler: Logger.Handler = (level, message) => {
      if (level === Level.WARN) warnings.push(message);
    };
    return { warnings, logger: { level: 'WARN' as const, handler } };
  }

  it('names every field that does nothing at the transformer position, array rules included', async () => {
    const { warnings, logger } = collectWarnings();
    const mapping: Mapping.Config = {
      consent: { marketing: true },
      include: ['data'],
      data: 'data',
      policy: { 'user.email': { value: '[redacted]' } },
      mapping: {
        order: {
          complete: [
            { condition: () => false, consent: { analytics: true } },
            {
              name: 'purchase',
              include: ['globals'],
              remove: ['data.id'],
              batch: 100,
              settings: { a: 1 },
              extend: { name: 'other' },
              data: 'data',
              silent: true,
            },
          ],
        },
        page: { view: { ignore: true } },
      },
    };

    await startFlow({ logger, transformers: { shape: { mapping } } });

    expect(warnings).toEqual([
      'Transformer shape: `mapping.consent`, `mapping.include`, `mapping.data`, ' +
        '`mapping.mapping.order.complete[0].consent`, ' +
        '`mapping.mapping.order.complete[1].include`, ' +
        '`mapping.mapping.order.complete[1].remove`, ' +
        '`mapping.mapping.order.complete[1].batch`, ' +
        '`mapping.mapping.order.complete[1].settings`, ' +
        '`mapping.mapping.order.complete[1].extend`, ' +
        '`mapping.mapping.order.complete[1].data`, ' +
        '`mapping.mapping.order.complete[1].silent` do nothing at the ' +
        "transformer position; only `policy` and a rule's `condition`, " +
        '`policy`, `name` and `ignore` apply.',
    ]);
  });

  it('warns on config.mapping by its own path', async () => {
    const { warnings, logger } = collectWarnings();

    await startFlow({
      logger,
      transformers: {
        shape: {
          config: { mapping: { mapping: { page: { view: { batch: 5 } } } } },
        },
      },
    });

    expect(warnings).toEqual([
      'Transformer shape: `config.mapping.mapping.page.view.batch` does nothing at the ' +
        "transformer position; only `policy` and a rule's `condition`, " +
        '`policy`, `name` and `ignore` apply.',
    ]);
  });

  it('stays silent for a mapping that only mutates the event', async () => {
    const { warnings, logger } = collectWarnings();

    await startFlow({
      logger,
      transformers: {
        shape: {
          mapping: {
            policy: { 'user.email': { value: '[redacted]' } },
            mapping: {
              order: {
                complete: [{ condition: () => true, name: 'purchase' }],
              },
              debug: { '*': { ignore: true, policy: { data: { value: {} } } } },
            },
          },
        },
      },
    });

    expect(warnings).toEqual([]);
  });

  it('warns that a mapping next to code never runs, and does not run it', async () => {
    const { warnings, logger } = collectWarnings();
    const events: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      logger,
      transformers: {
        coded: {
          code: async (context) => ({
            type: 'coded',
            config: context.config,
            push: (event) => ({ event }),
          }),
          mapping: { mapping: { order: { complete: { name: 'purchase' } } } },
        },
      },
      destinations: {
        capture: {
          before: ['coded'],
          code: {
            type: 'capture',
            config: {},
            push: async (event: WalkerOS.Event) => {
              events.push(event);
            },
          },
        },
      },
    });

    await elb({ name: 'order complete', data: {} });

    expect(warnings).toEqual([
      'Transformer coded: `mapping` is ignored: a transformer with `code` ' +
        'never runs it; a mapping applies only to a transformer without code.',
    ]);
    expect(events[0].name).toBe('order complete');
  });
});
