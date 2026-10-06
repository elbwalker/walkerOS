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
    // inEvent is the id-stamped copy the wrap forwards: the inbound fields
    // plus the minted span. Expecting the frame's own eventId inside it pins
    // that the record and the event it describes share one identity.
    expect(inFrame?.eventId).toBeTruthy();
    expect(inFrame?.inEvent).toEqual({ ...inbound, id: inFrame?.eventId });
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

  test('a pre-collector drop emits one collector skip / dropped', async () => {
    const states: FlowState[] = [];

    const { collector } = await startFlow({
      run: true,
      transformers: {
        gate: {
          code: async (context) => ({
            type: 'gate',
            config: context.config,
            push: () => false,
          }),
        },
      },
    });
    collector.observers.add((state) => states.push(state));

    const result = await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', preChain: 'gate' },
    );

    expect(result).toMatchObject({ ok: true, dropped: true });
    const drops = states.filter(
      (s) => s.stepId === 'collector.push' && s.phase === 'skip',
    );
    expect(drops).toEqual([
      expect.objectContaining({
        stepType: 'collector',
        skipReason: 'dropped',
        meta: { by: 'gate', at: 'source.web.next' },
      }),
    ]);
    // Counted as received, no out.
    expect(collector.status.in).toBe(1);
    expect(collector.status.out).toBe(0);
  });

  test('a source consent drop emits one collector skip / consent', async () => {
    const states: FlowState[] = [];
    const push = jest.fn();

    const { collector } = await startFlow({
      run: true,
      consent: { functional: true },
      destinations: { spy: { code: { type: 'spy', config: {}, push } } },
    });
    collector.observers.add((state) => states.push(state));

    const result = await collector.push(
      { name: 'page view', data: {}, consent: { analytics: false } },
      { id: 'web', mapping: { consent: { marketing: true } } },
    );

    expect(result).toMatchObject({ ok: true, dropped: true });
    expect(push).not.toHaveBeenCalled();
    const drops = states.filter(
      (s) => s.stepId === 'collector.push' && s.phase === 'skip',
    );
    expect(drops).toEqual([
      expect.objectContaining({
        stepType: 'collector',
        skipReason: 'consent',
        consent: { functional: true, analytics: false },
        meta: { at: 'source.web', required: { marketing: true } },
      }),
    ]);
    // Counted as received, no out.
    expect(collector.status.in).toBe(1);
    expect(collector.status.out).toBe(0);

    // Granted: the same push is delivered, with no skip.
    states.length = 0;
    const granted = await collector.push(
      { name: 'page view', data: {}, consent: { marketing: true } },
      { id: 'web', mapping: { consent: { marketing: true } } },
    );
    expect(granted.dropped).toBeUndefined();
    expect(push).toHaveBeenCalledTimes(1);
    expect(states.some((s) => s.phase === 'skip')).toBe(false);
  });
});
