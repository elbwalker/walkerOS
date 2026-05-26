import type { FlowState } from '@walkeros/core';
import { startFlow } from '..';

const FLOW_ID_DEFAULT = 'default';

describe('destination consent skip self-emission', () => {
  test('emits FlowState with phase=skip and skipReason=consent when a destination is consent-denied', async () => {
    const emitted: FlowState[] = [];
    const pushed: unknown[] = [];

    const { collector, elb } = await startFlow({
      run: true,
      consent: { analytics: true },
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
    collector.observers.add((state) => emitted.push(state));

    await elb({ name: 'page view', data: {} });

    expect(pushed).toHaveLength(0);

    const skip = emitted.find(
      (state) =>
        state.phase === 'skip' &&
        state.stepType === 'destination' &&
        state.skipReason === 'consent',
    );
    expect(skip).toBeDefined();
    expect(skip?.stepId).toBe('destination.gtag');
    expect(skip?.flowId).toBe(FLOW_ID_DEFAULT);
    expect(typeof skip?.eventId).toBe('string');
    expect(skip?.eventId.length).toBeGreaterThan(0);
    expect(skip?.consent).toEqual(expect.objectContaining({ analytics: true }));
    expect(skip?.meta).toEqual(
      expect.objectContaining({ required: { marketing: true } }),
    );

    const destPushOut = emitted.find(
      (state) => state.phase === 'out' && state.stepId === 'destination.gtag',
    );
    expect(destPushOut).toBeUndefined();

    expect(collector.destinations.gtag).toBeDefined();
  });

  test('does not emit a consent skip when destination consent is satisfied', async () => {
    const emitted: FlowState[] = [];
    const pushed: unknown[] = [];

    const { collector, elb } = await startFlow({
      run: true,
      consent: { marketing: true },
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
    collector.observers.add((state) => emitted.push(state));

    await elb({ name: 'page view', data: {} });

    expect(pushed).toHaveLength(1);

    const skip = emitted.find(
      (state) => state.phase === 'skip' && state.skipReason === 'consent',
    );
    expect(skip).toBeUndefined();
  });
});
