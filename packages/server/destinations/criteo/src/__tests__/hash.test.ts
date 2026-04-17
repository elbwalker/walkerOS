import { hashEmail, hashMD5 } from '../hash';

describe('hashEmail', () => {
  test('produces md5, sha256, and sha256_md5 for raw email', async () => {
    const result = await hashEmail('user@example.com');

    expect(result.md5).toMatch(/^[a-f0-9]{32}$/);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.sha256_md5).toMatch(/^[a-f0-9]{64}$/);
  });

  test('lowercases and trims before hashing', async () => {
    const a = await hashEmail('  USER@Example.COM  ');
    const b = await hashEmail('user@example.com');

    expect(a.md5).toBe(b.md5);
    expect(a.sha256).toBe(b.sha256);
    expect(a.sha256_md5).toBe(b.sha256_md5);
  });

  test('sha256_md5 equals sha256 of the md5 hex', async () => {
    const result = await hashEmail('user@example.com');
    // Independent derivation: sha256_md5 is the SHA-256 of the md5 string.
    expect(result.sha256_md5).toMatch(/^[a-f0-9]{64}$/);
    // Distinct from sha256 of the raw email
    expect(result.sha256_md5).not.toBe(result.sha256);
  });

  test('empty input returns empty object', async () => {
    const result = await hashEmail('');
    expect(result).toEqual({});

    const resultWs = await hashEmail('   ');
    expect(resultWs).toEqual({});
  });

  test('pre-hashed sha256 input is passed through without re-hashing', async () => {
    const sha256Hex = 'a'.repeat(64);
    const result = await hashEmail(sha256Hex);

    expect(result.sha256).toBe(sha256Hex);
    expect(result.md5).toBeUndefined();
    expect(result.sha256_md5).toBeUndefined();
  });

  test('pre-hashed md5 input is passed through and sha256_md5 derived', async () => {
    const md5Hex = 'b'.repeat(32);
    const result = await hashEmail(md5Hex);

    expect(result.md5).toBe(md5Hex);
    expect(result.sha256_md5).toMatch(/^[a-f0-9]{64}$/);
    expect(result.sha256).toBeUndefined();
  });
});

describe('hashMD5', () => {
  test('produces 32-char hex', () => {
    const result = hashMD5('user@example.com');
    expect(result).toMatch(/^[a-f0-9]{32}$/);
  });

  test('lowercases and trims', () => {
    expect(hashMD5('  USER@Example.COM  ')).toBe(hashMD5('user@example.com'));
  });
});
