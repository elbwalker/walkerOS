import {
  computeCounterDelta,
  type CounterSnapshot,
} from '../../../runtime/heartbeat.js';

describe('computeCounterDelta', () => {
  it('computes delta from zero (first heartbeat)', () => {
    const current: CounterSnapshot = {
      in: 100,
      out: 95,
      failed: 5,
      destinations: {
        ga4: { count: 50, failed: 2, duration: 1000 },
        mixpanel: { count: 45, failed: 3, duration: 800 },
      },
    };
    const last: CounterSnapshot = {
      in: 0,
      out: 0,
      failed: 0,
      destinations: {},
    };
    const delta = computeCounterDelta(current, last);
    expect(delta.eventsIn).toBe(100);
    expect(delta.eventsOut).toBe(95);
    expect(delta.eventsFailed).toBe(5);
    expect(delta.destinations.ga4.count).toBe(50);
    expect(delta.destinations.mixpanel.count).toBe(45);
  });

  it('computes delta from previous snapshot', () => {
    const last: CounterSnapshot = {
      in: 100,
      out: 95,
      failed: 5,
      destinations: {
        ga4: { count: 50, failed: 2, duration: 1000 },
      },
    };
    const current: CounterSnapshot = {
      in: 250,
      out: 240,
      failed: 10,
      destinations: {
        ga4: { count: 120, failed: 5, duration: 2500 },
      },
    };
    const delta = computeCounterDelta(current, last);
    expect(delta.eventsIn).toBe(150);
    expect(delta.eventsOut).toBe(145);
    expect(delta.eventsFailed).toBe(5);
    expect(delta.destinations.ga4.count).toBe(70);
    expect(delta.destinations.ga4.failed).toBe(3);
    expect(delta.destinations.ga4.duration).toBe(1500);
  });

  it('handles new destination appearing', () => {
    const last: CounterSnapshot = {
      in: 100,
      out: 95,
      failed: 5,
      destinations: {},
    };
    const current: CounterSnapshot = {
      in: 200,
      out: 190,
      failed: 10,
      destinations: {
        newDest: { count: 95, failed: 5, duration: 500 },
      },
    };
    const delta = computeCounterDelta(current, last);
    expect(delta.destinations.newDest.count).toBe(95);
    expect(delta.destinations.newDest.failed).toBe(5);
    expect(delta.destinations.newDest.duration).toBe(500);
  });

  it('returns zero delta when nothing changed', () => {
    const snapshot: CounterSnapshot = {
      in: 50,
      out: 50,
      failed: 0,
      destinations: {
        ga4: { count: 50, failed: 0, duration: 500 },
      },
    };
    const delta = computeCounterDelta(snapshot, snapshot);
    expect(delta.eventsIn).toBe(0);
    expect(delta.eventsOut).toBe(0);
    expect(delta.eventsFailed).toBe(0);
    expect(delta.destinations.ga4.count).toBe(0);
  });
});
