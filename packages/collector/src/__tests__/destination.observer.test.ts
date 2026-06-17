import type { FlowState, WalkerOS } from '@walkeros/core';
import { createTelemetryObserver } from '@walkeros/core';
import { startFlow } from '..';

describe('destination self-emission', () => {
  test('init emits a single phase=init state before destination.push', async () => {
    const states: FlowState[] = [];

    const { collector, elb } = await startFlow({
      run: true,
      destinations: {
        gtag: {
          code: {
            type: 'gtag',
            config: {},
            init: async () => {},
            push: async () => undefined,
          },
        },
      },
    });
    collector.observers.add((state) => states.push(state));

    await elb({ name: 'page view', data: {} });

    const init = states.find(
      (s) =>
        s.stepType === 'destination' &&
        s.stepId === 'destination.gtag' &&
        s.phase === 'init',
    );
    expect(init).toBeDefined();

    const pushIn = states.findIndex(
      (s) =>
        s.stepType === 'destination' &&
        s.stepId === 'destination.gtag' &&
        s.phase === 'in',
    );
    const initIdx = states.findIndex(
      (s) =>
        s.stepType === 'destination' &&
        s.stepId === 'destination.gtag' &&
        s.phase === 'init',
    );
    // init must precede the first push in.
    expect(initIdx).toBeLessThan(pushIn);
  });

  test('destination.push emits in+out for a successful push', async () => {
    const states: FlowState[] = [];

    const { collector, elb } = await startFlow({
      run: true,
      destinations: {
        gtag: {
          code: {
            type: 'gtag',
            config: {},
            push: async (event) => ({ ok: true, event: event.name }),
          },
        },
      },
    });
    collector.observers.add((state) => states.push(state));

    await elb({ name: 'page view', data: {} });

    const destStates = states.filter(
      (s) => s.stepType === 'destination' && s.stepId === 'destination.gtag',
    );
    expect(destStates.some((s) => s.phase === 'in')).toBe(true);
    expect(destStates.some((s) => s.phase === 'out')).toBe(true);
  });

  test('destination.pushBatch emits a flush state with batch size', async () => {
    jest.useFakeTimers();
    try {
      const states: FlowState[] = [];
      const batchCalls: number[] = [];

      const { collector, elb } = await startFlow({
        run: true,
        destinations: {
          gtag: {
            code: {
              type: 'gtag',
              push: async () => undefined,
              pushBatch: async (snapshot) => {
                batchCalls.push(snapshot.entries.length);
              },
              config: {
                mapping: {
                  '*': {
                    '*': { batch: { wait: 1 } },
                  },
                },
              },
            },
          },
        },
      });
      collector.observers.add((state) => states.push(state));

      await elb({ name: 'page view', data: {} });
      await elb({ name: 'order complete', data: {} });
      // Advance past the debounce window and let the await settle.
      await jest.advanceTimersByTimeAsync(10);

      expect(batchCalls.length).toBeGreaterThan(0);

      const flush = states.find(
        (s) =>
          s.stepType === 'destination' &&
          s.stepId === 'destination.gtag' &&
          s.phase === 'flush',
      );
      expect(flush).toBeDefined();
      expect(flush?.batch?.size).toBeGreaterThan(0);
      expect(flush?.batch?.index).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  test('trace observer carries inEvent on destination in frame and outEvent (delivered event) plus meta.response on out frame', async () => {
    const states: FlowState[] = [];
    let received: WalkerOS.Event | undefined;
    const response = { ok: true, id: 'resp-123' };

    const { collector, elb } = await startFlow({
      run: true,
      destinations: {
        gtag: {
          code: {
            type: 'gtag',
            config: {},
            push: async (event) => {
              received = event;
              return response;
            },
          },
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

    expect(received).toBeDefined();

    const inFrame = states.find(
      (s) =>
        s.stepType === 'destination' &&
        s.stepId === 'destination.gtag' &&
        s.phase === 'in',
    );
    expect(inFrame).toBeDefined();
    expect(inFrame?.inEvent).toEqual(received);

    const outFrame = states.find(
      (s) =>
        s.stepType === 'destination' &&
        s.stepId === 'destination.gtag' &&
        s.phase === 'out',
    );
    expect(outFrame).toBeDefined();
    // outEvent is the DELIVERED EVENT, not the API response.
    expect(outFrame?.outEvent).toEqual(received);
    // The raw API response moves to meta.response.
    expect(outFrame?.meta?.response).toEqual(response);
  });

  test('void-returning destination keeps outEvent as the event and attaches no response meta', async () => {
    const states: FlowState[] = [];
    let received: WalkerOS.Event | undefined;

    const { collector, elb } = await startFlow({
      run: true,
      destinations: {
        gtag: {
          code: {
            type: 'gtag',
            config: {},
            push: async (event) => {
              received = event;
            },
          },
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

    const outFrame = states.find(
      (s) =>
        s.stepType === 'destination' &&
        s.stepId === 'destination.gtag' &&
        s.phase === 'out',
    );
    expect(outFrame).toBeDefined();
    expect(outFrame?.outEvent).toEqual(received);
    expect(outFrame?.meta?.response).toBeUndefined();
  });

  test('standard observer strips inEvent/outEvent but keeps meta.response on the destination out frame', async () => {
    const states: FlowState[] = [];
    const response = { ok: true, id: 'resp-456' };

    const { collector, elb } = await startFlow({
      run: true,
      destinations: {
        gtag: {
          code: {
            type: 'gtag',
            config: {},
            push: async () => response,
          },
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
        s.stepType === 'destination' &&
        s.stepId === 'destination.gtag' &&
        s.phase === 'in',
    );
    expect(inFrame).toBeDefined();
    expect(inFrame?.inEvent).toBeUndefined();

    const outFrame = states.find(
      (s) =>
        s.stepType === 'destination' &&
        s.stepId === 'destination.gtag' &&
        s.phase === 'out',
    );
    expect(outFrame).toBeDefined();
    // Trace-gated payload stripped, but meta survives the projector.
    expect(outFrame?.outEvent).toBeUndefined();
    expect(outFrame?.meta?.response).toEqual(response);
  });
});
