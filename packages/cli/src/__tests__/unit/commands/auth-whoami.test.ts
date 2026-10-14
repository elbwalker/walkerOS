import { whoami } from '../../../commands/auth/index.js';

describe('whoami', () => {
  const originalEnv = process.env;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      WALKEROS_TOKEN: 'wos_pat_test',
      WALKEROS_APP_URL: 'https://app.example.test',
    };
  });
  afterEach(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
  });

  it('reads GET /api/auth/whoami with the token', async () => {
    let seen: { url: string; auth: string | null } | undefined;
    globalThis.fetch = async (input, init) => {
      seen = {
        url: String(input),
        auth: new Headers(init?.headers).get('Authorization'),
      };
      return new Response(
        JSON.stringify({
          userId: 'usr_1',
          email: 'test@example.com',
          projectId: null,
        }),
        { status: 200 },
      );
    };
    await expect(whoami()).resolves.toEqual({
      userId: 'usr_1',
      email: 'test@example.com',
      projectId: null,
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
});
