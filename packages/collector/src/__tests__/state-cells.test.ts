/**
 * State-cell bookkeeping shared across delivery paths: a destination's hold
 * is released only when no cell is lost or owed, and each delivery type
 * resolves its payload from the command or the collector.
 */
import type { Destination, On, WalkerOS } from '@walkeros/core';
import { startFlow, on } from '..';
import { getStateHold } from '../on';

describe('state hold', () => {
  it('a settled user delivery does not release the hold while consent is lost', async () => {
    const log: string[] = [];
    const code: Destination.Instance = {
      type: 'rec',
      config: {},
      init: () => undefined,
      push: (event: WalkerOS.Event) => {
        log.push(`push:${event.name}`);
      },
      on: (type) => {
        if (type === 'consent') throw new Error('sdk down');
        if (type === 'user') log.push('on:user');
      },
    };
    const { collector, elb } = await startFlow({
      logger: { handler: () => undefined },
      destinations: { rec: { code } },
    });
    await elb('page view', {});
    await elb('walker consent', { marketing: true });
    const rec = collector.destinations.rec;
    expect(getStateHold(rec)).toBeDefined();

    await elb('walker user', { id: 'u1' });

    expect(log).toContain('on:user');
    expect(getStateHold(rec)).toBeDefined();
  });
});

describe('delivery data', () => {
  it('a config subscription without a payload receives the collector config', async () => {
    const { collector } = await startFlow({});
    const received: unknown[] = [];
    await on(collector, 'config', (data: unknown) => {
      received.push(data);
    });
    expect(received).toEqual([collector.config]);
  });

  it('an arbitrary type receives no data', async () => {
    const { collector } = await startFlow({});
    const received: unknown[] = [];
    await on(collector, 'checkout', (data: unknown) => {
      received.push(data);
    });
    expect(received).toEqual([undefined]);
  });

  it('ready and run reach a destination without data', async () => {
    const seen: Array<[On.Types, unknown]> = [];
    const code: Destination.Instance = {
      type: 'rec',
      config: {},
      init: () => undefined,
      push: () => undefined,
      on: (type, context) => {
        if (type === 'ready' || type === 'run') seen.push([type, context.data]);
      },
    };
    const { collector } = await startFlow({
      run: false,
      destinations: { rec: { code } },
    });
    await collector.command('run');

    expect(seen.length).toBeGreaterThan(0);
    for (const [, data] of seen) expect(data).toBeUndefined();
  });
});
