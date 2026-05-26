import type { FlowState } from '@walkeros/core';
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
});
