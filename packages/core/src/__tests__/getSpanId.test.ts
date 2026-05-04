import { getSpanId } from '../getSpanId';

describe('getSpanId', () => {
  it('returns 16 lowercase hex chars', () => {
    const id = getSpanId();
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });

  it('produces different ids on subsequent calls', () => {
    expect(getSpanId()).not.toBe(getSpanId());
  });
});
