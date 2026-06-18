import type { FlowState, WalkerOS } from '@walkeros/core';
import { createTelemetryObserver } from '@walkeros/core';
import { startFlow } from '..';

describe('collector.push self-emission', () => {
  test('emits in+out FlowState pair on a successful push', async () => {
    const states: FlowState[] = [];

    const { collector, elb } = await startFlow({
      run: true,
      destinations: {},
    });
    collector.observers.add((state) => states.push(state));

    await elb({ name: 'page view', data: {} });

    const pushStates = states.filter(
      (s) => s.stepId === 'collector.push' && s.stepType === 'collector',
    );
    expect(pushStates.some((s) => s.phase === 'in')).toBe(true);
    expect(pushStates.some((s) => s.phase === 'out')).toBe(true);
  });

  test('emits an error phase when push throws inside the wrap', async () => {
    const states: FlowState[] = [];

    const { collector, elb } = await startFlow({
      run: true,
      destinations: {
        boom: {
          code: {
            type: 'boom',
            config: {},
            push: async () => {
              throw new Error('destination kaboom');
            },
          },
        },
      },
    });
    collector.observers.add((state) => states.push(state));

    await elb({ name: 'page view', data: {} });

    // collector.push wrap completes successfully (the throw is caught in
    // destinationPush). The destination.push site emits the error.
    const destError = states.find(
      (s) =>
        s.stepType === 'destination' &&
        s.stepId === 'destination.boom' &&
        s.phase === 'error',
    );
    expect(destError).toBeDefined();
    expect(destError?.error?.message).toContain('destination kaboom');
  });

  test('trace observer keeps inEvent on the collector.push in frame', async () => {
    const states: FlowState[] = [];

    const { collector, elb } = await startFlow({
      run: true,
      destinations: {},
    });
    collector.observers.add(
      createTelemetryObserver((state) => states.push(state), {
        flowId: 'default',
        level: 'trace',
      }),
    );

    const inbound: WalkerOS.DeepPartialEvent = { name: 'page view', data: {} };
    await elb(inbound);

    const inFrame = states.find(
      (s) =>
        s.stepId === 'collector.push' &&
        s.stepType === 'collector' &&
        s.phase === 'in',
    );
    expect(inFrame).toBeDefined();
    expect(inFrame?.inEvent).toEqual(inbound);
  });

  test('standard observer strips inEvent from the collector.push in frame', async () => {
    const states: FlowState[] = [];

    const { collector, elb } = await startFlow({
      run: true,
      destinations: {},
    });
    collector.observers.add(
      createTelemetryObserver((state) => states.push(state), {
        flowId: 'default',
        level: 'standard',
      }),
    );

    await elb({ name: 'page view', data: {} });

    const inFrame = states.find(
      (s) =>
        s.stepId === 'collector.push' &&
        s.stepType === 'collector' &&
        s.phase === 'in',
    );
    expect(inFrame).toBeDefined();
    expect(inFrame?.inEvent).toBeUndefined();
  });
});
