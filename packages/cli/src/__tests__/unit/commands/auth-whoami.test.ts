import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { NOT_SIGNED_IN } from '../../../commands/api/index.js';
import type { Credential } from '../../../core/auth.js';
import { credentialSourceLine, whoami } from '../../../commands/auth/index.js';
import { writeCredentials } from '../../../lib/credentials.js';

const APP = 'https://app.example.test';
const AUTH = 'https://auth.example.test';

describe('whoami', () => {
  const originalEnv = process.env;
  const originalFetch = globalThis.fetch;
  let configHome: string;

  beforeEach(() => {
    configHome = mkdtempSync(join(tmpdir(), 'walkeros-whoami-'));
    process.env = {
      ...originalEnv,
      XDG_CONFIG_HOME: configHome,
      WALKEROS_APP_URL: APP,
    };
    delete process.env.WALKEROS_CREDENTIAL;
    writeCredentials({
      [AUTH]: {
        issuer: AUTH,
        resource: `${APP}/api`,
        client_id: `${AUTH}/oauth/walkeros-cli`,
        token_endpoint: `${AUTH}/api/oauth/token`,
        revocation_endpoint: `${AUTH}/api/oauth/revoke`,
        access_token: 'wos_at_test',
        expires_at: Date.now() + 3_600_000,
        refresh_token: 'wos_rt_test',
      },
    });
  });
  afterEach(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
    rmSync(configHome, { recursive: true, force: true });
  });

  const sources: Array<[Credential, string]> = [
    [
      {
        source: 'credential',
        auth: {
          origin: APP,
          authorize: async () => ({}),
          token: async () => ({
            token: 't',
            type: 'DPoP',
            expiresAt: new Date(0),
          }),
          answered: () => false,
          close: () => undefined,
        },
      },
      'Credential: WALKEROS_CREDENTIAL',
    ],
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
      auth: 'Bearer wos_at_test',
    });
  });

  it('throws the app error message', async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          error: { code: 'FORBIDDEN', message: 'No access to this account' },
        }),
        { status: 403 },
      );
    await expect(whoami()).rejects.toThrow('No access to this account');
  });

  it('refuses without a credential, with the line the api command prints', async () => {
    rmSync(configHome, { recursive: true, force: true });
    await expect(whoami()).rejects.toThrow(NOT_SIGNED_IN);
  });
});
