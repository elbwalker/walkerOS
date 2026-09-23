import { createHmac } from 'crypto';
import { getHashServer } from '../getHashServer';

describe('getHashServer', () => {
  test('defaults to sha256 (64 hex chars), unchanged behavior', async () => {
    const result = await getHashServer('user@example.com');
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  test('honors length on sha256', async () => {
    const result = await getHashServer('user@example.com', 8);
    expect(result).toHaveLength(8);
    expect(result).toMatch(/^[a-f0-9]{8}$/);
  });

  test('algorithm: md5 produces 32 hex chars', async () => {
    const result = await getHashServer('user@example.com', undefined, {
      algorithm: 'md5',
    });
    expect(result).toMatch(/^[a-f0-9]{32}$/);
  });

  test('without a key, output is the plain sha256 digest', async () => {
    expect(await getHashServer('user@example.com')).toBe(
      'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514',
    );
  });

  test('a key produces an HMAC, and different keys differ', async () => {
    const plain = await getHashServer('user@example.com');
    const a = await getHashServer('user@example.com', undefined, { key: 'a' });
    const b = await getHashServer('user@example.com', undefined, { key: 'b' });
    expect(a).toBe(
      createHmac('sha256', 'a').update('user@example.com').digest('hex'),
    );
    expect(a).not.toBe(plain);
    expect(a).not.toBe(b);
  });

  test('length truncates a keyed hash', async () => {
    const result = await getHashServer('user@example.com', 16, { key: 'a' });
    expect(result).toBe(
      createHmac('sha256', 'a')
        .update('user@example.com')
        .digest('hex')
        .slice(0, 16),
    );
  });

  test('md5 is deterministic and matches node crypto', async () => {
    const a = await getHashServer('user@example.com', undefined, {
      algorithm: 'md5',
    });
    const b = await getHashServer('user@example.com', undefined, {
      algorithm: 'md5',
    });
    expect(a).toBe(b);
  });
});
