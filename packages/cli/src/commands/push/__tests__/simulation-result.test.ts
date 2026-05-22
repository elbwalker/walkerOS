import { buildSimulationResult } from '../simulation-result';

describe('buildSimulationResult', () => {
  it('maps captured events to events[] and drops null events', () => {
    const r = buildSimulationResult({
      step: 'transformer',
      name: 'redact',
      startTime: Date.now(),
      captured: [
        { event: { name: 'order complete' }, timestamp: 0 },
        { event: null, timestamp: 1 },
        { event: undefined, timestamp: 2 },
      ],
    });
    expect(r.step).toBe('transformer');
    expect(r.name).toBe('redact');
    expect(r.events).toEqual([{ name: 'order complete' }]);
    expect(r.calls).toEqual([]);
    expect(r.error).toBeUndefined();
    expect(typeof r.duration).toBe('number');
  });

  it('returns empty events[] when no captured provided', () => {
    const r = buildSimulationResult({
      step: 'source',
      name: 'browser',
      startTime: Date.now(),
    });
    expect(r.events).toEqual([]);
    expect(r.calls).toEqual([]);
  });

  it('flattens usage into calls[] for a destination', () => {
    const r = buildSimulationResult({
      step: 'destination',
      name: 'gtag',
      startTime: Date.now(),
      usage: {
        gtag: [{ fn: 'window.gtag', args: ['event', 'purchase'], ts: 5 }],
      },
    });
    expect(r.events).toEqual([]);
    expect(r.calls).toEqual([
      { fn: 'window.gtag', args: ['event', 'purchase'], ts: 5 },
    ]);
  });

  it('flattens usage across multiple destination keys into one calls[]', () => {
    const r = buildSimulationResult({
      step: 'destination',
      name: 'multi',
      startTime: Date.now(),
      usage: {
        a: [{ fn: 'a.fn', args: [1], ts: 1 }],
        b: [{ fn: 'b.fn', args: [2], ts: 2 }],
      },
    });
    expect(r.calls).toEqual([
      { fn: 'a.fn', args: [1], ts: 1 },
      { fn: 'b.fn', args: [2], ts: 2 },
    ]);
  });

  it('wraps non-Error errors into Error', () => {
    const r = buildSimulationResult({
      step: 'source',
      name: 'browser',
      startTime: Date.now(),
      error: 'boom',
    });
    expect(r.error).toBeInstanceOf(Error);
    expect(r.error?.message).toBe('boom');
  });

  it('passes through an existing Error instance unchanged', () => {
    const err = new Error('explicit');
    const r = buildSimulationResult({
      step: 'transformer',
      name: 'enrich',
      startTime: Date.now(),
      error: err,
    });
    expect(r.error).toBe(err);
  });

  it('computes a numeric duration from startTime', () => {
    const r = buildSimulationResult({
      step: 'source',
      name: 'browser',
      startTime: Date.now() - 5,
    });
    expect(r.duration).toBeGreaterThanOrEqual(0);
  });
});
