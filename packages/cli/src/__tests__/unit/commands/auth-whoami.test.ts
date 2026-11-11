import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { NOT_SIGNED_IN } from '../../../commands/api/index.js';
import type { Credential } from '../../../core/auth.js';
import { credentialSourceLine, whoami } from '../../../commands/auth/index.js';

describe('whoami', () => {
  const originalEnv = process.env;
  const originalFetch = globalThis.fetch;
  let configHome: string;

  beforeEach(() => {
    configHome = mkdtempSync(join(tmpdir(), 'walkeros-whoami-'));
    process.env = {
      ...originalEnv,
      XDG_CONFIG_HOME: configHome,
      WALKEROS_TOKEN: 'wos_pat_test',
      WALKEROS_APP_URL: 'https://app.example.test',
    };
  });
  afterEach(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
    rmSync(configHome, { recursive: true, force: true });
  });

  const sources: Array<[Credential, string]> = [
    [{ source: 'env', token: 't' }, 'Credential: WALKEROS_TOKEN'],
    [
      { source: 'login', token: 't', issuer: 'https://app.walkeros.io' },
      'Credential: signed in to https://app.walkeros.io',
    ],
  ];

  it.each(sources)(
    'names where the credential comes from, never the token',
    (credential, line) => {
      expect(credentialSourceLine(credential)).toBe(line);
    },
  );

  it('reads GET /api/auth/whoami with the token', async () => {
    let seen: { url: string; auth: string | null } | undefined;
    globalThis.fetch = async (input, init) => {
      seen = {
        url: String(input),
        auth: new Headers(init?.headers).get('Authorization'),
      };
      return new Response(
        JSON.stringify({ userId: 'usr_1', email: 'test@example.com' }),
        { status: 200 },
      );
    };
    await expect(whoami()).resolves.toEqual({
      userId: 'usr_1',
      email: 'test@example.com',
    });
    expect(seen).toEqual({
      url: 'https://app.example.test/api/auth/whoami',
      auth: 'Bearer wos_pat_test',
    });
  });

  it('throws the app error message', async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          error: { code: 'UNAUTHORIZED', message: 'Token expired' },
        }),
        { status: 401 },
      );
    await expect(whoami()).rejects.toThrow('Token expired');
  });

  it('refuses without WALKEROS_TOKEN, with the line the api command prints', async () => {
    delete process.env.WALKEROS_TOKEN;
    await expect(whoami()).rejects.toThrow(NOT_SIGNED_IN);
  });
});
