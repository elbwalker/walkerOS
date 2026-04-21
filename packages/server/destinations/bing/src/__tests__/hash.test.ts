import { hashUserData, normalizeEmail } from '../hash';

describe('hashUserData', () => {
  test('hashes em and ph', async () => {
    const userData = {
      em: 'user@example.com',
      ph: '+14135552671',
    };

    const result = await hashUserData(userData);

    expect(result.em).not.toBe(userData.em);
    expect(result.ph).not.toBe(userData.ph);

    expect(result.em).toMatch(/^[a-f0-9]{64}$/);
    expect(result.ph).toMatch(/^[a-f0-9]{64}$/);
  });

  test('does NOT hash anonymousId, externalId, msclkid, clientIpAddress, clientUserAgent, idfa, gaid', async () => {
    const userData = {
      anonymousId: 'anon-abc',
      externalId: 'user-123',
      msclkid: 'msclkid-xyz',
      clientIpAddress: '192.0.2.1',
      clientUserAgent: 'Mozilla/5.0',
      idfa: 'IDFA-abcd',
      gaid: 'GAID-1234',
    };

    const result = await hashUserData(userData);

    expect(result.anonymousId).toBe('anon-abc');
    expect(result.externalId).toBe('user-123');
    expect(result.msclkid).toBe('msclkid-xyz');
    expect(result.clientIpAddress).toBe('192.0.2.1');
    expect(result.clientUserAgent).toBe('Mozilla/5.0');
    expect(result.idfa).toBe('IDFA-abcd');
    expect(result.gaid).toBe('GAID-1234');
  });

  test('respects doNotHash array', async () => {
    const userData = {
      em: 'user@example.com',
      ph: '+14135552671',
    };

    const result = await hashUserData(userData, ['em']);

    // em should NOT be hashed (passes through as-is, no normalization)
    expect(result.em).toBe('user@example.com');

    // ph should still be hashed
    expect(result.ph).not.toBe('+14135552671');
    expect(result.ph).toMatch(/^[a-f0-9]{64}$/);
  });

  test('handles empty object', async () => {
    const result = await hashUserData({});
    expect(result).toEqual({});
  });

  test('handles undefined fields gracefully', async () => {
    const userData = { em: 'user@example.com' };

    const result = await hashUserData(userData);

    expect(result.em).toMatch(/^[a-f0-9]{64}$/);
    expect(result.ph).toBeUndefined();
  });

  test('email normalization: dots removed from user portion', async () => {
    // "a.b.c@example.com" normalizes to "abc@example.com"
    const resultDotted = await hashUserData({ em: 'a.b.c@example.com' });
    const resultPlain = await hashUserData({ em: 'abc@example.com' });
    expect(resultDotted.em).toBe(resultPlain.em);
  });

  test('email normalization: +alias suffix stripped', async () => {
    const resultAlias = await hashUserData({ em: 'user+promo@example.com' });
    const resultNoAlias = await hashUserData({ em: 'user@example.com' });
    expect(resultAlias.em).toBe(resultNoAlias.em);
  });

  test('email normalization: lowercased and trimmed', async () => {
    const resultMixed = await hashUserData({ em: '  USER@Example.COM  ' });
    const resultLower = await hashUserData({ em: 'user@example.com' });
    expect(resultMixed.em).toBe(resultLower.em);
  });

  test('phone normalization: whitespace trimmed', async () => {
    const resultSpaced = await hashUserData({ ph: '  +14135552671  ' });
    const resultPlain = await hashUserData({ ph: '+14135552671' });
    expect(resultSpaced.ph).toBe(resultPlain.ph);
  });

  test('normalizeEmail exposes normalization helper', () => {
    expect(normalizeEmail('  User.Name+promo@Example.COM  ')).toBe(
      'username@example.com',
    );
    expect(normalizeEmail('nouser')).toBe('nouser');
  });

  test('mixed hashable and non-hashable fields', async () => {
    const userData = {
      em: 'user@example.com',
      externalId: 'ext-1',
      msclkid: 'click-42',
      clientIpAddress: '10.0.0.1',
    };

    const result = await hashUserData(userData);

    expect(result.em).toMatch(/^[a-f0-9]{64}$/);
    expect(result.externalId).toBe('ext-1');
    expect(result.msclkid).toBe('click-42');
    expect(result.clientIpAddress).toBe('10.0.0.1');
  });
});
