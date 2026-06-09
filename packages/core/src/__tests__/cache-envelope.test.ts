import { wrapCacheEnvelope, readCacheEnvelope } from '../cache-envelope';
import type { StoreValue } from '../types/store';

describe('wrapCacheEnvelope', () => {
  it('wraps a value with exp = now + ttlMs', () => {
    const now = () => 1000;
    expect(wrapCacheEnvelope({ a: 1 }, 500, now)).toEqual({
      __walkeros_cache_v__: { a: 1 },
      __walkeros_cache_exp__: 1500,
    });
  });

  it('omits exp entirely when no ttl is given (no expiry)', () => {
    const wrapped = wrapCacheEnvelope({ a: 1 });
    expect(wrapped).toEqual({ __walkeros_cache_v__: { a: 1 } });
    expect('__walkeros_cache_exp__' in wrapped).toBe(false);
  });

  it('preserves a Uint8Array binary leaf inside the value', () => {
    const value: StoreValue = { body: new Uint8Array([1, 2, 3]) };
    const wrapped = wrapCacheEnvelope(value, 1000, () => 0);
    expect(wrapped.__walkeros_cache_v__).toBe(value);
  });
});

describe('readCacheEnvelope', () => {
  it('returns undefined for an absent (undefined) value', () => {
    expect(readCacheEnvelope(undefined)).toBeUndefined();
  });

  it('returns the unwrapped value for a live envelope', () => {
    const wrapped = wrapCacheEnvelope({ a: 1 }, 1000, () => 0);
    expect(readCacheEnvelope(wrapped, () => 500)).toEqual({ value: { a: 1 } });
  });

  it('reports an expired envelope as expired', () => {
    const wrapped = wrapCacheEnvelope('x', 100, () => 0);
    expect(readCacheEnvelope(wrapped, () => 200)).toEqual({ expired: true });
  });

  it('returns a value with no exp as live forever', () => {
    const wrapped = wrapCacheEnvelope({ a: 1 });
    expect(readCacheEnvelope(wrapped, () => 1e15)).toEqual({
      value: { a: 1 },
    });
  });

  it('returns a non-envelope value verbatim (raw live value tolerance)', () => {
    expect(readCacheEnvelope({ a: 1 })).toEqual({ value: { a: 1 } });
    expect(readCacheEnvelope('plain')).toEqual({ value: 'plain' });
    expect(readCacheEnvelope(true)).toEqual({ value: true });
  });

  it('round-trips a Uint8Array binary leaf', () => {
    const value: StoreValue = { body: new Uint8Array([255, 0, 128]) };
    const wrapped = wrapCacheEnvelope(value, 1000, () => 0);
    const read = readCacheEnvelope(wrapped, () => 1);
    expect(read).toEqual({ value });
  });

  it('does not mistake a user value shaped {value, exp} for an envelope', () => {
    const userValue: StoreValue = { value: 'user-data', exp: 42 };
    const wrapped = wrapCacheEnvelope(userValue, 1000, () => 0);
    // The user object is nested under the reserved key, not at the top level.
    expect(readCacheEnvelope(wrapped, () => 1)).toEqual({ value: userValue });
    // Reading the raw user object directly returns it verbatim (it is not an
    // envelope because it lacks the reserved key).
    expect(readCacheEnvelope(userValue)).toEqual({ value: userValue });
  });
});
