import type { Destination, WalkerOS } from '@walkeros/core';
import { startFlow } from '..';

describe('delivery order across a destination init', () => {
  it('delivers events pushed without awaiting in push order to a destination without init', async () => {
    const names: string[] = [];
    const destination: Destination.Instance = {
      type: 'recorder',
      config: {},
      push: (event: WalkerOS.Event) => {
        names.push(event.name);
      },
    };
    const { elb } = await startFlow({
      destinations: { recorder: { code: destination } },
    });

    await Promise.all([elb('a one'), elb('b two'), elb('c three')]);

    expect(names).toEqual(['a one', 'b two', 'c three']);
  });

  it('keeps push order behind an async init too', async () => {
    const names: string[] = [];
    const destination: Destination.Instance = {
      type: 'recorder',
      config: {},
      init: async () => {
        // Several turns, so later pushes arrive while it runs.
        for (let turn = 0; turn < 10; turn++) await Promise.resolve();
      },
      push: (event: WalkerOS.Event) => {
        names.push(event.name);
      },
    };
    const { elb } = await startFlow({
      destinations: { recorder: { code: destination } },
    });

    await Promise.all([elb('a one'), elb('b two'), elb('c three')]);

    expect(names).toEqual(['a one', 'b two', 'c three']);
  });

  it('fails the events queued behind an init that fails, never leaves them waiting', async () => {
    const destination: Destination.Instance = {
      type: 'broken',
      config: {},
      init: async () => {
        for (let turn = 0; turn < 10; turn++) await Promise.resolve();
        throw new Error('init failed');
      },
      push: jest.fn(),
    };
    const { elb, collector } = await startFlow({
      logger: { handler: () => undefined },
      destinations: { broken: { code: destination } },
    });

    await Promise.all([elb('a one'), elb('b two'), elb('c three')]);

    expect(collector.status.destinations.broken.failed).toBe(3);
    expect(collector.destinations.broken.queuePush ?? []).toHaveLength(0);
    expect(
      (collector.destinations.broken.dlq ?? []).map(([event]) => event.name),
    ).toEqual(['a one', 'b two', 'c three']);
  });
});
