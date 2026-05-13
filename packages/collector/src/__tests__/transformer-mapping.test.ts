import { startFlow } from '..';
import type { WalkerOS } from '@walkeros/core';

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
});
