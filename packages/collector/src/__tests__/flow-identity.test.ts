import type { FlowState, WalkerOS, Collector, Elb } from '@walkeros/core';
import { startFlow } from '..';
import { buildBaseState, type BuildBaseStateArgs } from '../observerEmit';

// Jest injects the package version as this global (packages/config/jest).
declare const __VERSION__: string;

const baseArgs: BuildBaseStateArgs = {
  stepId: 'collector.push',
  stepType: 'collector',
  phase: 'in',
  eventId: 'evt-1',
  now: 1500,
};

// Start a flow with a spy destination that records every delivered event.
async function startSpyFlow(
  identity: Pick<Collector.InitConfig, 'name' | 'release'>,
): Promise<{ elb: Elb.Fn; delivered: WalkerOS.Event[] }> {
  const delivered: WalkerOS.Event[] = [];
  const { elb } = await startFlow({
    ...identity,
    run: true,
    destinations: {
      spy: {
        code: {
          type: 'spy',
          config: {},
          push: (event: WalkerOS.Event) => {
            delivered.push(event);
          },
        },
      },
    },
  });
  return { elb, delivered };
}

describe('flow identity', () => {
  test('startFlow mirrors name and release onto the collector instance', async () => {
    const { collector } = await startFlow({ name: 'web', release: 'v3' });
    expect(collector.name).toBe('web');
    expect(collector.release).toBe('v3');
  });

  test('buildBaseState stamps flowId from collector.name', async () => {
    const { collector } = await startFlow({ name: 'web' });
    const state = buildBaseState(collector, baseArgs);
    expect(state.flowId).toBe('web');
  });

  test('buildBaseState flowId falls back to "default" without a name', async () => {
    const { collector } = await startFlow({});
    const state = buildBaseState(collector, baseArgs);
    expect(state.flowId).toBe('default');
  });

  test('a FlowState emitted through the observer carries the flow name', async () => {
    const states: FlowState[] = [];
    const { collector, elb } = await startFlow({ name: 'web', run: true });
    collector.observers.add((state) => states.push(state));

    await elb({ name: 'page view', data: {} });

    const emitted = states.filter((s) => s.stepId === 'collector.push');
    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted.every((s) => s.flowId === 'web')).toBe(true);
  });
});

describe('source.release provenance', () => {
  test('single flow keys source.release by the flow name and drops source.version', async () => {
    const { elb, delivered } = await startSpyFlow({
      name: 'web',
      release: 'f00',
    });

    await elb({ name: 'page view', data: {} });

    expect(delivered).toHaveLength(1);
    const event = delivered[0];
    if (!event) throw new Error('no event delivered');
    expect(event.source.release).toEqual({ web: 'f00' });
    expect(event.source.version).toBeUndefined();
  });

  test('release accumulates across a crossing, preserving incoming entries', async () => {
    const { elb, delivered } = await startSpyFlow({
      name: 'ingest',
      release: 'b4r',
    });

    await elb({
      name: 'page view',
      data: {},
      source: { type: 'server', release: { web: 'f00' } },
    });

    expect(delivered).toHaveLength(1);
    const event = delivered[0];
    if (!event) throw new Error('no event delivered');
    expect(event.source.release).toEqual({ web: 'f00', ingest: 'b4r' });
  });

  test('release value falls back to the package version without a config release', async () => {
    const { elb, delivered } = await startSpyFlow({ name: 'web' });

    await elb({ name: 'page view', data: {} });

    const event = delivered[0];
    if (!event) throw new Error('no event delivered');
    expect(__VERSION__.length).toBeGreaterThan(0);
    expect(event.source.release).toEqual({ web: __VERSION__ });
  });

  test('release key falls back to the source platform without a flow name', async () => {
    const { elb, delivered } = await startSpyFlow({});

    await elb({
      name: 'page view',
      data: {},
      source: { type: 'express', platform: 'server' },
    });

    const event = delivered[0];
    if (!event) throw new Error('no event delivered');
    expect(event.source.release).toEqual({ server: __VERSION__ });
  });

  test('release key falls back to "default" without a flow name or platform', async () => {
    const { elb, delivered } = await startSpyFlow({});

    await elb({ name: 'page view', data: {} });

    const event = delivered[0];
    if (!event) throw new Error('no event delivered');
    expect(event.source.release).toEqual({ default: __VERSION__ });
  });
});
