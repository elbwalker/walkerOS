import { startFlow } from '../';
import type { WalkerOS } from '@walkeros/core';

const makeCaptureDestination = (captured: WalkerOS.Event[]) => ({
  code: {
    type: 'capture',
    config: {},
    push: (event: WalkerOS.Event) => {
      captured.push(event);
    },
  },
});

describe('pre-run hold buffer', () => {
  test('an event pushed while dormant is held, not discarded, and not yet delivered', async () => {
    const captured: WalkerOS.Event[] = [];
    const { collector, elb } = await startFlow({
      run: false,
      destinations: { cap: makeCaptureDestination(captured) },
    });

    const result = await elb({ name: 'page view', data: {} });

    expect(result.ok).toBe(true); // accepted-and-held, not a failure
    expect(captured).toHaveLength(0); // nothing delivered pre-run
    expect(collector.preRunQueue).toHaveLength(1);
    expect(collector.preRunQueue[0].event.name).toBe('page view');
  });

  test('the buffer is bounded by queueMax with drop-oldest', async () => {
    const { collector, elb } = await startFlow({
      run: false,
      queueMax: 2,
    });

    await elb({ name: 'a one', data: {} });
    await elb({ name: 'b two', data: {} });
    await elb({ name: 'c three', data: {} });

    expect(collector.preRunQueue).toHaveLength(2);
    expect(collector.preRunQueue.map((h) => h.event.name)).toEqual([
      'b two',
      'c three',
    ]);
  });

  test('overflow is counted in status.dropped, separately from the replay buffer', async () => {
    const { collector, elb } = await startFlow({ run: false, queueMax: 2 });

    await elb({ name: 'a one', data: {} });
    await elb({ name: 'b two', data: {} });
    // Third push evicts the oldest: one real event lost, so it must be counted
    // and not merely debug-logged.
    await elb({ name: 'c three', data: {} });

    expect(collector.status.dropped['collector.preRun']?.queue).toBe(1);
    // Kept apart from the post-run replay buffer's counter.
    expect(collector.status.dropped.collector?.queue).toBeUndefined();

    await elb({ name: 'd four', data: {} });
    expect(collector.status.dropped['collector.preRun']?.queue).toBe(2);
  });

  test('a failing replayed event surfaces in the run result', async () => {
    const { collector, elb } = await startFlow({
      run: false,
      destinations: {
        boom: {
          code: {
            type: 'boom',
            config: {},
            push: () => {
              throw new Error('destination down');
            },
          },
        },
      },
    });

    await elb({ name: 'page view', data: {} });

    const result = await collector.command('run');

    // The held event's own caller already got ok:true at hold time, so the run
    // is the only place this failure can be seen.
    expect(result.ok).toBe(false);
    // And it says WHICH destination, rather than an unexplained false.
    expect(result.failed).toEqual(
      expect.objectContaining({ boom: expect.anything() }),
    );
  });

  test('a successful replay leaves the run result ok', async () => {
    const captured: WalkerOS.Event[] = [];
    const { collector, elb } = await startFlow({
      run: false,
      destinations: { cap: makeCaptureDestination(captured) },
    });

    await elb({ name: 'page view', data: {} });
    const result = await collector.command('run');

    expect(result.ok).toBe(true);
    expect(captured).toHaveLength(1);
  });

  test('held events replay FIFO on run, after state redelivery, exactly once', async () => {
    const captured: WalkerOS.Event[] = [];
    const { collector, elb } = await startFlow({
      run: false,
      destinations: { cap: makeCaptureDestination(captured) },
    });

    await elb('walker consent', { essential: true });
    await elb({ name: 'checkout view', data: { step: 2 } });
    await elb({ name: 'product view', data: { id: 'p1' } });

    await collector.command('run');

    const names = captured.map((e) => e.name);
    expect(names).toEqual(['checkout view', 'product view']); // FIFO
    // Replay ran the pipeline post-run: consent recorded pre-run is on the event.
    expect(captured[0].consent).toEqual(
      expect.objectContaining({ essential: true }),
    );
    expect(collector.preRunQueue).toHaveLength(0);

    // A second run must not re-deliver held events.
    await collector.command('run');
    expect(captured.filter((e) => e.name === 'checkout view')).toHaveLength(1);
  });
});
