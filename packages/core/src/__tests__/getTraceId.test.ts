import { getTraceId } from '../getTraceId';

describe('getTraceId', () => {
  it('returns a 32-char lowercase hex string (W3C trace-id shape)', () => {
    for (let i = 0; i < 50; i++) {
      expect(getTraceId()).toMatch(/^[0-9a-f]{32}$/);
    }
  });

  it('never returns the all-zero trace id', () => {
    for (let i = 0; i < 50; i++) {
      expect(getTraceId()).not.toMatch(/^0+$/);
    }
  });

  it('draws from crypto.getRandomValues when available', () => {
    const spy = jest.spyOn(globalThis.crypto, 'getRandomValues');
    getTraceId();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('generates distinct ids', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) ids.add(getTraceId());
    expect(ids.size).toBe(1000);
  });
});
