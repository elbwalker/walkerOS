import { getTraceUntil, setTraceUntil } from '../traceState';

describe('traceState', () => {
  afterEach(() => {
    setTraceUntil(null);
  });

  it('returns null initially', () => {
    expect(getTraceUntil()).toBeNull();
  });

  it('stores a value set via setTraceUntil', () => {
    setTraceUntil('2026-06-01T00:00:00.000Z');
    expect(getTraceUntil()).toBe('2026-06-01T00:00:00.000Z');
  });

  it('clears back to null when set to null', () => {
    setTraceUntil('2026-06-01T00:00:00.000Z');
    setTraceUntil(null);
    expect(getTraceUntil()).toBeNull();
  });
});
