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
