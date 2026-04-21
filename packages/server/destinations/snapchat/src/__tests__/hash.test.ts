import { hashUserData } from '../hash';

describe('hashUserData', () => {
  test('hashes em, ph, fn, ln, db, ge, ct, st, zp, country, external_id', async () => {
    const userData = {
      em: 'user@example.com',
      ph: '+14135552671',
      fn: 'alex',
      ln: 'walker',
      db: '19900101',
      ge: 'm',
      ct: 'berlin',
      st: 'be',
      zp: '10115',
      country: 'de',
      external_id: 'user-123',
    };

    const result = await hashUserData(userData);

    // All 11 fields should be hashed (not equal to original)
    expect(result.em).not.toBe(userData.em);
    expect(result.ph).not.toBe(userData.ph);
    expect(result.fn).not.toBe(userData.fn);
    expect(result.ln).not.toBe(userData.ln);
    expect(result.db).not.toBe(userData.db);
    expect(result.ge).not.toBe(userData.ge);
    expect(result.ct).not.toBe(userData.ct);
    expect(result.st).not.toBe(userData.st);
    expect(result.zp).not.toBe(userData.zp);
    expect(result.country).not.toBe(userData.country);
    expect(result.external_id).not.toBe(userData.external_id);

    // Should be SHA256 hex strings (64 chars)
    expect(result.em).toMatch(/^[a-f0-9]{64}$/);
    expect(result.ph).toMatch(/^[a-f0-9]{64}$/);
    expect(result.fn).toMatch(/^[a-f0-9]{64}$/);
    expect(result.ln).toMatch(/^[a-f0-9]{64}$/);
    expect(result.db).toMatch(/^[a-f0-9]{64}$/);
    expect(result.ge).toMatch(/^[a-f0-9]{64}$/);
    expect(result.ct).toMatch(/^[a-f0-9]{64}$/);
    expect(result.st).toMatch(/^[a-f0-9]{64}$/);
    expect(result.zp).toMatch(/^[a-f0-9]{64}$/);
    expect(result.country).toMatch(/^[a-f0-9]{64}$/);
    expect(result.external_id).toMatch(/^[a-f0-9]{64}$/);
  });

  test('does NOT hash sc_cookie1, client_ip_address, client_user_agent, sc_click_id, idfv, madid', async () => {
    const userData = {
      sc_cookie1: 'cookie-abc',
      client_ip_address: '192.0.2.1',
      client_user_agent: 'Mozilla/5.0',
      sc_click_id: 'ck-42',
      idfv: 'IDFV-abcd',
      madid: 'MADID-1234',
    };

    const result = await hashUserData(userData);

    expect(result.sc_cookie1).toBe('cookie-abc');
    expect(result.client_ip_address).toBe('192.0.2.1');
    expect(result.client_user_agent).toBe('Mozilla/5.0');
    expect(result.sc_click_id).toBe('ck-42');
    expect(result.idfv).toBe('IDFV-abcd');
    expect(result.madid).toBe('MADID-1234');
  });

  test('respects doNotHash array', async () => {
    const userData = {
      em: 'user@example.com',
      ph: '+14135552671',
      external_id: 'user-123',
    };

    const result = await hashUserData(userData, ['em']);

    // em should NOT be hashed
    expect(result.em).toBe('user@example.com');

    // ph and external_id should still be hashed
    expect(result.ph).not.toBe('+14135552671');
    expect(result.external_id).not.toBe('user-123');
    expect(result.ph).toMatch(/^[a-f0-9]{64}$/);
    expect(result.external_id).toMatch(/^[a-f0-9]{64}$/);
  });

  test('handles empty object', async () => {
    const result = await hashUserData({});
    expect(result).toEqual({});
  });

  test('handles undefined fields gracefully', async () => {
    const userData = {
      em: 'user@example.com',
    };

    const result = await hashUserData(userData);

    expect(result.em).toMatch(/^[a-f0-9]{64}$/);
    expect(result.ph).toBeUndefined();
    expect(result.external_id).toBeUndefined();
  });

  test('mixed hashable and non-hashable fields', async () => {
    const userData = {
      em: 'user@example.com',
      sc_cookie1: 'cookie-value',
      external_id: 'ext-1',
      client_ip_address: '10.0.0.1',
    };

    const result = await hashUserData(userData);

    expect(result.em).toMatch(/^[a-f0-9]{64}$/);
    expect(result.sc_cookie1).toBe('cookie-value');
    expect(result.external_id).toMatch(/^[a-f0-9]{64}$/);
    expect(result.client_ip_address).toBe('10.0.0.1');
  });
});
