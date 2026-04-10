import { hashUserData } from '../hash';

describe('hashUserData', () => {
  test('hashes email, phone_number, external_id', async () => {
    const userData = {
      email: 'user@example.com',
      phone_number: '+14135552671',
      external_id: 'user-123',
    };

    const result = await hashUserData(userData);

    // All three fields should be hashed (not equal to original)
    expect(result.email).not.toBe(userData.email);
    expect(result.phone_number).not.toBe(userData.phone_number);
    expect(result.external_id).not.toBe(userData.external_id);

    // Should be SHA256 hex strings (64 chars)
    expect(result.email).toMatch(/^[a-f0-9]{64}$/);
    expect(result.phone_number).toMatch(/^[a-f0-9]{64}$/);
    expect(result.external_id).toMatch(/^[a-f0-9]{64}$/);
  });

  test('does NOT hash ttp, ttclid, locale', async () => {
    const userData = {
      ttp: 'abc123def456',
      ttclid: 'E.C.P.abc123',
      locale: 'en-US',
    };

    const result = await hashUserData(userData);

    expect(result.ttp).toBe('abc123def456');
    expect(result.ttclid).toBe('E.C.P.abc123');
    expect(result.locale).toBe('en-US');
  });

  test('respects doNotHash array', async () => {
    const userData = {
      email: 'user@example.com',
      phone_number: '+14135552671',
      external_id: 'user-123',
    };

    const result = await hashUserData(userData, ['email']);

    // email should NOT be hashed
    expect(result.email).toBe('user@example.com');

    // phone_number and external_id should still be hashed
    expect(result.phone_number).not.toBe('+14135552671');
    expect(result.external_id).not.toBe('user-123');
  });

  test('handles empty object', async () => {
    const result = await hashUserData({});
    expect(result).toEqual({});
  });

  test('handles undefined fields gracefully', async () => {
    const userData = {
      email: 'user@example.com',
    };

    const result = await hashUserData(userData);

    expect(result.email).toMatch(/^[a-f0-9]{64}$/);
    expect(result.phone_number).toBeUndefined();
    expect(result.external_id).toBeUndefined();
  });

  test('mixed hashable and non-hashable fields', async () => {
    const userData = {
      email: 'user@example.com',
      ttp: 'cookie-value',
      external_id: 'ext-1',
      locale: 'de-DE',
    };

    const result = await hashUserData(userData);

    expect(result.email).toMatch(/^[a-f0-9]{64}$/);
    expect(result.ttp).toBe('cookie-value');
    expect(result.external_id).toMatch(/^[a-f0-9]{64}$/);
    expect(result.locale).toBe('de-DE');
  });
});
