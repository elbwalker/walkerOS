import type { FlowState, WalkerOS } from '@walkeros/core';
import { createTelemetryObserver } from '@walkeros/core';
import { startFlow } from '..';

describe('transformer.push self-emission', () => {
  test('emits in+out for a successful transformer push', async () => {
    const states: FlowState[] = [];

    const { collector, elb } = await startFlow({
      run: true,
      transformers: {
        echo: {
          code: async (context) => ({
            type: 'echo',
            config: context.config,
            push: async (event) => ({ event }),
          }),
        },
      },
      destinations: {
        sink: {
          code: { type: 'sink', config: {}, push: async () => undefined },
          before: 'echo',
        },
      },
    });
    collector.observers.add((state) => states.push(state));

    await elb({ name: 'page view', data: {} });

    const tStates = states.filter(
      (s) => s.stepType === 'transformer' && s.stepId === 'transformer.echo',
    );
    expect(tStates.some((s) => s.phase === 'in')).toBe(true);
    expect(tStates.some((s) => s.phase === 'out')).toBe(true);
  });

  test('emits error when transformer throws', async () => {
    const states: FlowState[] = [];

    const { collector, elb } = await startFlow({
      run: true,
      transformers: {
        bomb: {
          code: async (context) => ({
            type: 'bomb',
            config: context.config,
            push: async () => {
              throw new Error('transformer kaboom');
            },
          }),
        },
      },
      destinations: {
        sink: {
          code: { type: 'sink', config: {}, push: async () => undefined },
          before: 'bomb',
        },
      },
    });
    collector.observers.add((state) => states.push(state));

    await elb({ name: 'page view', data: {} });

    const err = states.find(
      (s) =>
        s.stepType === 'transformer' &&
        s.stepId === 'transformer.bomb' &&
        s.phase === 'error',
    );
    expect(err).toBeDefined();
    expect(err?.error?.message).toContain('transformer kaboom');
  });

  test('trace observer keeps inEvent/outEvent on the transformer frames', async () => {
    const states: FlowState[] = [];
    let seenEvent: WalkerOS.DeepPartialEvent | undefined;

    const { collector, elb } = await startFlow({
      run: true,
      transformers: {
        echo: {
          code: async (context) => ({
            type: 'echo',
            config: context.config,
            push: async (event) => {
              seenEvent = event;
              return { event };
            },
          }),
        },
      },
      destinations: {
        sink: {
          code: { type: 'sink', config: {}, push: async () => undefined },
          before: 'echo',
        },
      },
    });
    collector.observers.add(
      createTelemetryObserver((state) => states.push(state), {
        flowId: 'default',
        level: 'trace',
      }),
    );

    await elb({ name: 'page view', data: {} });

    const inFrame = states.find(
      (s) =>
        s.stepType === 'transformer' &&
        s.stepId === 'transformer.echo' &&
        s.phase === 'in',
    );
    expect(inFrame).toBeDefined();
    expect(seenEvent).toBeDefined();
    expect(inFrame?.inEvent).toEqual(seenEvent);

    const outFrame = states.find(
      (s) =>
        s.stepType === 'transformer' &&
        s.stepId === 'transformer.echo' &&
        s.phase === 'out',
    );
    expect(outFrame).toBeDefined();
    expect(outFrame?.outEvent).toEqual({ event: seenEvent });
  });

  test('standard observer strips inEvent from the transformer in frame', async () => {
    const states: FlowState[] = [];

    const { collector, elb } = await startFlow({
      run: true,
      transformers: {
        echo: {
          code: async (context) => ({
            type: 'echo',
            config: context.config,
            push: async (event) => ({ event }),
          }),
        },
      },
      destinations: {
        sink: {
          code: { type: 'sink', config: {}, push: async () => undefined },
          before: 'echo',
        },
      },
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
        s.stepType === 'transformer' &&
        s.stepId === 'transformer.echo' &&
        s.phase === 'in',
    );
    expect(inFrame).toBeDefined();
    expect(inFrame?.inEvent).toBeUndefined();
  });
});
