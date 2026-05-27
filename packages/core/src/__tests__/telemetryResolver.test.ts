import { resolveTelemetryOptions } from '..';

const NOW = 1_700_000_000_000;
const FUTURE = new Date(NOW + 60_000).toISOString();
const PAST = new Date(NOW - 60_000).toISOString();

describe('resolveTelemetryOptions', () => {
  it('returns trace level when WALKEROS_TRACE_UNTIL is in the future', () => {
    const opts = resolveTelemetryOptions({
      flowId: 'flow_x',
      env: { WALKEROS_TRACE_UNTIL: FUTURE },
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

  it('ignores WALKEROS_TRACE_UNTIL when expired', () => {
    const opts = resolveTelemetryOptions({
      flowId: 'flow_x',
      observe: { level: 'standard' },
      env: { WALKEROS_TRACE_UNTIL: PAST },
      now: () => NOW,
    });
    expect(opts).toEqual({
      flowId: 'flow_x',
      level: 'standard',
      sample: 1,
    });
  });

  it('returns null when level is off and no trace override', () => {
    const opts = resolveTelemetryOptions({
      flowId: 'flow_x',
      observe: { level: 'off' },
      env: {},
      now: () => NOW,
    });
    expect(opts).toBeNull();
  });

  it('falls back to standard level when observe is undefined', () => {
    const opts = resolveTelemetryOptions({
      flowId: 'flow_x',
      env: {},
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
      env: {},
      now: () => NOW,
    });
    expect(opts?.sample).toBe(0.1);
  });

  it('ignores malformed WALKEROS_TRACE_UNTIL values', () => {
    const opts = resolveTelemetryOptions({
      flowId: 'flow_x',
      env: { WALKEROS_TRACE_UNTIL: 'not-a-date' },
      now: () => NOW,
    });
    expect(opts).toEqual({
      flowId: 'flow_x',
      level: 'standard',
      sample: 1,
    });
  });
});
