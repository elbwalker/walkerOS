import { resolveTelemetryOptions } from '..';

const NOW = 1_700_000_000_000;
const FUTURE = new Date(NOW + 60_000).toISOString();
const PAST = new Date(NOW - 60_000).toISOString();

describe('resolveTelemetryOptions', () => {
  it('returns trace level when traceUntil is in the future', () => {
    const opts = resolveTelemetryOptions({
      flowId: 'flow_x',
      traceUntil: FUTURE,
      now: () => NOW,
    });
    expect(opts).toEqual({
      flowId: 'flow_x',
      level: 'trace',
      includeIn: true,
      includeOut: true,
      sample: 1,
    });
  });

  it('ignores traceUntil when expired', () => {
    const opts = resolveTelemetryOptions({
      flowId: 'flow_x',
      observe: { level: 'standard' },
      traceUntil: PAST,
      now: () => NOW,
    });
    expect(opts).toEqual({
      flowId: 'flow_x',
      level: 'standard',
      sample: 1,
    });
  });

  it('falls back to baseline observe when traceUntil is null', () => {
    const opts = resolveTelemetryOptions({
      flowId: 'flow_x',
      observe: { level: 'standard' },
      traceUntil: null,
    });
    expect(opts).toEqual({
      flowId: 'flow_x',
      level: 'standard',
      sample: 1,
    });
  });

  it('returns trace when baseline is off but traceUntil is in the future', () => {
    const opts = resolveTelemetryOptions({
      flowId: 'flow_x',
      observe: { level: 'off' },
      traceUntil: FUTURE,
      now: () => NOW,
    });
    expect(opts).toMatchObject({ level: 'trace' });
  });

  it('returns null when level is off and traceUntil is null', () => {
    const opts = resolveTelemetryOptions({
      flowId: 'flow_x',
      observe: { level: 'off' },
      traceUntil: null,
    });
    expect(opts).toBeNull();
  });

  it('returns null when level is off and no trace override', () => {
    const opts = resolveTelemetryOptions({
      flowId: 'flow_x',
      observe: { level: 'off' },
      now: () => NOW,
    });
    expect(opts).toBeNull();
  });

  it('falls back to standard level when observe is undefined', () => {
    const opts = resolveTelemetryOptions({
      flowId: 'flow_x',
      now: () => NOW,
    });
    expect(opts).toEqual({
      flowId: 'flow_x',
      level: 'standard',
      sample: 1,
    });
  });

  it('honors a custom sample fraction', () => {
    const opts = resolveTelemetryOptions({
      flowId: 'flow_x',
      observe: { level: 'standard', sample: 0.1 },
    });
    expect(opts?.sample).toBe(0.1);
  });

  it('ignores malformed traceUntil values', () => {
    const opts = resolveTelemetryOptions({
      flowId: 'flow_x',
      traceUntil: 'not-a-date',
      now: () => NOW,
    });
    expect(opts).toEqual({
      flowId: 'flow_x',
      level: 'standard',
      sample: 1,
    });
  });
});
