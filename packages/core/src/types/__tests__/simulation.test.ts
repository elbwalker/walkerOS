import type { Simulation, WalkerOS } from '../../index';

describe('Simulation type contracts', () => {
  it('StepLog has required fields', () => {
    const log: Simulation.StepLog = {
      step: 'destination.ga4',
      status: 'processed',
      in: { name: 'page view' },
      out: { event_name: 'page_view' },
      duration: 42,
    };
    expect(log.step).toBe('destination.ga4');
    expect(log.status).toBe('processed');
  });

  it('StepLog supports all statuses', () => {
    const statuses: Simulation.StepLog['status'][] = [
      'processed',
      'blocked',
      'queued',
      'filtered',
    ];
    expect(statuses).toHaveLength(4);
  });

  it('SimulateFlowParams accepts full state', () => {
    const params: Simulation.SimulateFlowParams = {
      config: { version: 1, flows: {} },
      step: 'source.cmp',
      input: { marketing: true },
      state: {
        consent: { marketing: true },
        user: { id: 'u1' },
        globals: { lang: 'en' },
      },
    };
    expect(params.step).toBe('source.cmp');
  });

  it('SimulateFlowResult returns updated state', () => {
    const result: Simulation.SimulateFlowResult = {
      stepLogs: [{ step: 'source.cmp', status: 'processed', duration: 10 }],
      state: { consent: { marketing: true }, allowed: true },
    };
    expect(result.stepLogs).toHaveLength(1);
    expect(result.state.consent?.marketing).toBe(true);
  });

  it('FlowState fields are all optional', () => {
    const empty: Simulation.FlowState = {};
    const partial: Simulation.FlowState = { consent: { analytics: true } };
    expect(empty).toEqual({});
    expect(partial.consent?.analytics).toBe(true);
  });
});
