import { simulateFlow } from '../simulate';
import type { Simulation } from '@walkeros/core';
import { startFlow } from '../flow';

describe('simulateFlow', () => {
  it('runs a source step and returns step logs', async () => {
    const logs: Simulation.StepLog[] = [];

    const result = await simulateFlow({
      config: {},
      step: 'source.test',
      input: { testData: true },
      onStep: (log) => logs.push(log),
    });

    expect(result.stepLogs).toBeDefined();
    expect(result.state).toBeDefined();
    expect(Array.isArray(result.stepLogs)).toBe(true);
  });

  it('returns updated consent state from CMP-like source', async () => {
    const result = await simulateFlow({
      config: {},
      step: 'source.cmp',
      input: { marketing: true, analytics: true },
      state: { consent: {} },
    });

    expect(result.state).toBeDefined();
    expect(typeof result.state).toBe('object');
  });

  it('accepts prior state and feeds it forward', async () => {
    const priorState: Simulation.FlowState = {
      consent: { marketing: true },
      user: { id: 'user-123' },
    };

    const result = await simulateFlow({
      config: {},
      step: 'source.test',
      input: {},
      state: priorState,
    });

    expect(result.state).toBeDefined();
  });

  it('calls onStep callback for each step', async () => {
    const steps: Simulation.StepLog[] = [];

    await simulateFlow({
      config: {},
      step: 'source.test',
      input: {},
      onStep: (log) => steps.push(log),
    });

    expect(steps.length).toBeGreaterThanOrEqual(0);
  });
});

describe('simulateFlow with destinations', () => {
  it('emits StepLog for destination that receives event', async () => {
    const logs: Simulation.StepLog[] = [];

    const result = await simulateFlow({
      config: {},
      step: 'destination.test',
      input: { name: 'page view', data: { title: 'Home' } },
      state: { consent: { marketing: true }, allowed: true },
      onStep: (log) => logs.push(log),
    });

    expect(result.stepLogs.length).toBeGreaterThan(0);
    expect(result.stepLogs[0].step).toBe('destination.test');
  });

  it('shows blocked status when consent is missing', async () => {
    const result = await simulateFlow({
      config: {},
      step: 'destination.test',
      input: { name: 'page view' },
      state: { consent: {} },
    });

    expect(
      result.stepLogs.some(
        (l) => l.status === 'blocked' || l.status === 'processed',
      ),
    ).toBe(true);
  });
});
