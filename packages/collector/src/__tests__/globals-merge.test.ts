import { startFlow } from '..';
import { enrichEvent } from '../handle';
import type { Transformer, WalkerOS } from '@walkeros/core';

describe('globals merge', () => {
  test('base globals apply to an event that carries none', async () => {
    const { collector } = await startFlow({ globalsStatic: { env: 'prod' } });

    const event = enrichEvent(collector, { name: 'order complete' });

    expect(event.globals).toEqual({ env: 'prod' });
  });

  test('event globals win over the base per key', async () => {
    const { collector } = await startFlow({
      globalsStatic: { env: 'prod', plan: 'free' },
    });

    const event = enrichEvent(collector, {
      name: 'order complete',
      globals: { plan: 'pro' },
    });

    expect(event.globals).toEqual({ env: 'prod', plan: 'pro' });
  });

  test('a destination before chain sees the merged globals', async () => {
    const seen: WalkerOS.DeepPartialEvent['globals'][] = [];
    const { elb } = await startFlow({
      run: true,
      globalsStatic: { env: 'prod' },
      transformers: {
        spy: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'spy',
            config: context.config,
            push: async (event) => {
              seen.push(event.globals);
              return { event };
            },
          }),
        },
      },
      destinations: {
        capture: {
          code: {
            type: 'test',
            config: {},
            push: async () => {},
          },
          before: ['spy'],
        },
      },
    });

    await elb({ name: 'order complete', globals: { plan: 'pro' } });

    expect(seen).toEqual([{ env: 'prod', plan: 'pro' }]);
  });

  test('an event queued for consent keeps the globals it was captured with', async () => {
    const pushed: WalkerOS.Event[] = [];
    const { elb } = await startFlow({
      run: true,
      destinations: {
        gtag: {
          code: {
            type: 'gtag',
            config: { consent: { marketing: true } },
            push: async (event) => {
              pushed.push(event);
            },
          },
        },
      },
    });

    await elb({ name: 'order complete', globals: { foo: 'bar' } });
    expect(pushed).toHaveLength(0);

    await elb('walker globals', { plan: 'pro' });
    await elb('walker consent', { marketing: true });

    expect(pushed).toHaveLength(1);
    expect(pushed[0]?.globals).toEqual({ foo: 'bar' });
  });

  test('an event held for a destination require gate keeps the globals it was captured with', async () => {
    const pushed: WalkerOS.Event[] = [];
    const { elb } = await startFlow({
      run: true,
      destinations: {
        gated: {
          code: {
            type: 'gated',
            config: {},
            push: async (event) => {
              pushed.push(event);
            },
          },
          config: { require: ['globals'] },
        },
      },
    });

    await elb('page view');
    expect(pushed).toHaveLength(0);

    await elb('walker globals', { lang: 'en' });

    expect(pushed).toHaveLength(1);
    expect(pushed[0]?.globals).toEqual({});
  });
});
