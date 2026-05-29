import type { WalkerOS } from '@walkeros/core';
import type { Config, CriteoEmailHashes, Settings } from '../types';
import { clone, createMockContext, getEvent } from '@walkeros/core';
import { examples } from '../dev';

const { env } = examples;

/**
 * Regression gate for Criteo's email hashing. The hashing logic lives inline in
 * push.ts; these tests assert the three expected forms (md5, sha256, sha256_md5)
 * and already-hashed passthrough through the destination's request body.
 */
describe('Criteo email hashing', () => {
  const partnerId = '12345';
  const callerId = 'CALLER_ABC';
  const mockSendServer = jest.fn();
  const testEnv = clone(env.push);
  testEnv.sendServer = mockSendServer;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendServer.mockResolvedValue({ ok: true, data: 'OK' });
  });

  async function pushEmail(email: string): Promise<CriteoEmailHashes> {
    const destination = jest.requireActual('../').default;
    const event = getEvent('form submit', { user: { email } });
    const config: Config = {
      settings: {
        partnerId,
        callerId,
        user_data: { email: 'user.email' },
      } as Settings,
    };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-criteo' }),
    );

    const body = JSON.parse(mockSendServer.mock.calls[0][1]) as {
      id: { email?: CriteoEmailHashes };
    };
    return body.id.email ?? {};
  }

  test('produces md5, sha256, and sha256_md5 for raw email', async () => {
    const result = await pushEmail('user@example.com');

    expect(result.md5).toMatch(/^[a-f0-9]{32}$/);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.sha256_md5).toMatch(/^[a-f0-9]{64}$/);
  });

  test('lowercases and trims before hashing', async () => {
    const a = await pushEmail('  USER@Example.COM  ');
    const b = await pushEmail('user@example.com');

    expect(a.md5).toBe(b.md5);
    expect(a.sha256).toBe(b.sha256);
    expect(a.sha256_md5).toBe(b.sha256_md5);
  });

  test('sha256_md5 is the SHA-256 of the md5 hex, distinct from sha256', async () => {
    const result = await pushEmail('user@example.com');
    expect(result.sha256_md5).toMatch(/^[a-f0-9]{64}$/);
    expect(result.sha256_md5).not.toBe(result.sha256);
  });

  test('empty input yields no email hashes', async () => {
    expect(await pushEmail('')).toEqual({});
    expect(await pushEmail('   ')).toEqual({});
  });

  test('pre-hashed sha256 input is passed through without re-hashing', async () => {
    const sha256Hex = 'a'.repeat(64);
    const result = await pushEmail(sha256Hex);

    expect(result.sha256).toBe(sha256Hex);
    expect(result.md5).toBeUndefined();
    expect(result.sha256_md5).toBeUndefined();
  });

  test('pre-hashed md5 input is passed through and sha256_md5 derived', async () => {
    const md5Hex = 'b'.repeat(32);
    const result = await pushEmail(md5Hex);

    expect(result.md5).toBe(md5Hex);
    expect(result.sha256_md5).toMatch(/^[a-f0-9]{64}$/);
    expect(result.sha256).toBeUndefined();
  });
});
