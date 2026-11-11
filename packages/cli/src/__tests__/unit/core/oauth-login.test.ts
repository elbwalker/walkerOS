import { createHash } from 'crypto';
import { createServer } from 'http';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable, Writable } from 'stream';
import {
  authorizeUrl,
  createPkce,
  createState,
  discover,
  refreshStoredLogin,
  SignInError,
} from '../../../core/oauth-login.js';
import { resolveAccessToken, resolveCredential } from '../../../core/auth.js';
import {
  getCredentialsPath,
  writeCredentials,
  type StoredLogin,
} from '../../../lib/credentials.js';
import { runApi, type ApiCommandIO } from '../../../commands/api/index.js';
import { startFakeApp, type FakeApp } from '../../helpers/fake-oauth-app.js';

const env = process.env;
let app: FakeApp;
let configHome: string;

function stored(overrides: Partial<StoredLogin> = {}): StoredLogin {
  return {
    issuer: app.issuer,
    client_id: `${app.issuer}/oauth/walkeros-cli`,
    token_endpoint: `${app.issuer}/api/oauth/token`,
    revocation_endpoint: `${app.issuer}/api/oauth/revoke`,
    access_token: 'wos_at_stored',
    expires_at: Date.now() + 3600_000,
    refresh_token: 'wos_rt_stored',
    scope: 'read write offline_access',
    ...overrides,
  };
}

function fileLogins(): Record<string, StoredLogin> {
  return JSON.parse(readFileSync(getCredentialsPath(), 'utf-8'));
}

function sink() {
  const chunks: Buffer[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, done) {
      chunks.push(Buffer.from(chunk));
      done();
    },
  });
  return { stream, text: () => Buffer.concat(chunks).toString('utf-8') };
}

beforeEach(async () => {
  app = await startFakeApp();
  configHome = mkdtempSync(join(tmpdir(), 'walkeros-login-'));
  process.env = {
    ...env,
    XDG_CONFIG_HOME: configHome,
    WALKEROS_APP_URL: app.issuer,
  };
  delete process.env.WALKEROS_TOKEN;
});

afterEach(async () => {
  process.env = env;
  await app.close();
  rmSync(configHome, { recursive: true, force: true });
});

describe('PKCE and the authorization request', () => {
  it('makes an S256 pair, a base64url state of at most 128 characters, and sends no resource', async () => {
    const pkce = createPkce();
    expect(pkce.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(pkce.challenge).toBe(
      createHash('sha256').update(pkce.verifier).digest('base64url'),
    );
    const state = createState();
    expect(state).toMatch(/^[A-Za-z0-9_-]{1,128}$/);

    const url = new URL(
      authorizeUrl(await discover(app.issuer), {
        redirectUri: 'http://127.0.0.1:1234/callback',
        challenge: pkce.challenge,
        state,
      }),
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: `${app.issuer}/oauth/walkeros-cli`,
      redirect_uri: 'http://127.0.0.1:1234/callback',
      code_challenge: pkce.challenge,
      code_challenge_method: 'S256',
      scope: 'read write offline_access',
      state,
    });
  });
});

describe('discovery', () => {
  it('takes the client id from the issuer and picks the code page by origin, not by scheme', async () => {
    await expect(discover(`${app.issuer}/`)).resolves.toEqual({
      issuer: app.issuer,
      authorizationEndpoint: `${app.issuer}/oauth/authorize`,
      tokenEndpoint: `${app.issuer}/api/oauth/token`,
      revocationEndpoint: `${app.issuer}/api/oauth/revoke`,
      clientId: `${app.issuer}/oauth/walkeros-cli`,
      codePage: `${app.issuer}/oauth/cli-code`,
    });
  });
});

describe('resolveCredential', () => {
  it('prefers WALKEROS_TOKEN over a stored login, and resolveAccessToken stays env only', async () => {
    writeCredentials({ [app.issuer]: stored() });
    expect(resolveAccessToken()).toBeNull();
    process.env.WALKEROS_TOKEN = 'wos_pat_env';
    await expect(resolveCredential()).resolves.toEqual({
      source: 'env',
      token: 'wos_pat_env',
    });
  });

  it('attaches the stored login only for its own origin', async () => {
    writeCredentials({ [app.issuer]: stored() });
    await expect(resolveCredential()).resolves.toEqual({
      source: 'login',
      token: 'wos_at_stored',
      issuer: app.issuer,
    });
    process.env.WALKEROS_APP_URL = 'https://staging.example.dev/';
    await expect(resolveCredential()).rejects.toThrow(
      `signed in to ${app.issuer}, not https://staging.example.dev: run walkeros login`,
    );
    expect(app.requests).toEqual([]);
  });

  it('renews at the stored token endpoint, never at one discovered again', async () => {
    const refresh = await mintRefreshToken();
    writeCredentials({
      [app.issuer]: stored({
        token_endpoint: `${app.issuer}/custom/token`,
        expires_at: Date.now() + 30_000,
        refresh_token: refresh,
      }),
    });
    const credential = await resolveCredential();
    expect(credential?.token).toMatch(/^wos_at_/);
    expect(app.requests.map((r) => `${r.method} ${r.path}`)).toEqual([
      'POST /custom/token',
    ]);
    expect(app.requests[0].form).toEqual({
      grant_type: 'refresh_token',
      client_id: `${app.issuer}/oauth/walkeros-cli`,
      refresh_token: refresh,
    });
  });

  it('stores the rotated pair by temp file and rename, readable only by its owner', async () => {
    const refresh = await mintRefreshToken();
    writeCredentials({
      [app.issuer]: stored({ expires_at: 0, refresh_token: refresh }),
    });
    const credential = await resolveCredential();
    const login = fileLogins()[app.issuer];
    expect(login.access_token).toBe(credential?.token);
    expect(login.refresh_token).not.toBe(refresh);
    expect(login.refresh_token).toMatch(/^wos_rt_/);
    expect(statSync(getCredentialsPath()).mode & 0o777).toBe(0o600);
    expect(readdirSync(join(configHome, 'walkeros')).sort()).toEqual([
      'credentials.json',
    ]);
  });

  it('makes one token request for two commands renewing at once', async () => {
    const refresh = await mintRefreshToken();
    writeCredentials({
      [app.issuer]: stored({ expires_at: 0, refresh_token: refresh }),
    });
    const rotate = app.token;
    // Hold the answer, so the second command waits behind the lock.
    app.token = async (form) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return rotate(form);
    };
    const [a, b] = await Promise.all([
      resolveCredential(),
      resolveCredential(),
    ]);
    expect(app.count('POST', '/api/oauth/token')).toBe(1);
    expect(a?.token).toBe(b?.token);
  });

  it.each([
    ['invalid_grant', { status: 400, body: { error: 'invalid_grant' } }],
    ['invalid_client', { status: 401, body: { error: 'invalid_client' } }],
  ])('removes the login when the app answers %s', async (_name, answer) => {
    writeCredentials({ [app.issuer]: stored({ expires_at: 0 }) });
    app.token = () => answer;
    await expect(resolveCredential()).rejects.toThrow(
      `your sign-in to ${app.issuer} ended: run walkeros login`,
    );
    expect(fileLogins()).toEqual({});
  });

  it('keeps the login when the app cannot be reached', async () => {
    writeCredentials({ [app.issuer]: stored({ expires_at: 0 }) });
    app.token = () => ({ status: 0, drop: true });
    await expect(resolveCredential()).rejects.toThrow(
      `could not reach ${app.issuer} to renew the sign-in`,
    );
    expect(fileLogins()[app.issuer].refresh_token).toBe('wos_rt_stored');
  });

  it('never follows a redirect from the token endpoint', async () => {
    let stolen = 0;
    const elsewhere = createServer((_req, res) => {
      stolen += 1;
      res.end('{}');
    });
    await new Promise<void>((resolve) =>
      elsewhere.listen(0, '127.0.0.1', resolve),
    );
    const address = elsewhere.address();
    const port =
      address !== null && typeof address === 'object' ? address.port : 0;
    writeCredentials({ [app.issuer]: stored({ expires_at: 0 }) });
    app.token = () => ({
      status: 307,
      headers: { Location: `http://127.0.0.1:${port}/steal` },
    });
    try {
      await expect(resolveCredential()).rejects.toThrow(SignInError);
      expect(stolen).toBe(0);
      expect(fileLogins()[app.issuer].refresh_token).toBe('wos_rt_stored');
    } finally {
      await new Promise((resolve) => elsewhere.close(resolve));
    }
  });
});

describe('the credentials lock', () => {
  function lockPath(): string {
    return join(configHome, 'walkeros', 'credentials.lock');
  }

  it('breaks a lock a dead command left behind', async () => {
    const refresh = await mintRefreshToken();
    writeCredentials({
      [app.issuer]: stored({ expires_at: 0, refresh_token: refresh }),
    });
    writeFileSync(lockPath(), '999999 old');
    const old = new Date(Date.now() - 60_000);
    utimesSync(lockPath(), old, old);
    await expect(resolveCredential()).resolves.toMatchObject({
      source: 'login',
    });
    expect(existsSync(lockPath())).toBe(false);
  });

  it('times out behind a live lock with the sentence that says what to do', async () => {
    writeCredentials({ [app.issuer]: stored({ expires_at: 0 }) });
    mkdirSync(join(configHome, 'walkeros'), { recursive: true });
    writeFileSync(lockPath(), `${process.pid} now`);
    await expect(
      refreshStoredLogin(app.issuer, {
        timing: { waitMs: 300, staleMs: 30_000, pollMs: 50 },
      }),
    ).rejects.toThrow(
      `another walkeros command is updating the sign-in in ${join(configHome, 'walkeros')}: try again`,
    );
    expect(app.requests).toEqual([]);
  });
});

describe('walkeros api with a stored login', () => {
  function io(): { io: ApiCommandIO; err: () => string } {
    const out = sink();
    const err = sink();
    return {
      io: { stdout: out.stream, stderr: err.stream, stdin: Readable.from([]) },
      err: err.text,
    };
  }

  it('answers a 401 to an unexpired token with one renewal and one retry, never a loop', async () => {
    const refresh = await mintRefreshToken();
    writeCredentials({ [app.issuer]: stored({ refresh_token: refresh }) });
    const ok = io();
    expect(
      await runApi(
        { method: 'GET', path: '/api/auth/whoami', header: [] },
        ok.io,
      ),
    ).toBe(0);
    expect(app.count('GET', '/api/auth/whoami')).toBe(2);
    expect(app.count('POST', '/api/oauth/token')).toBe(1);

    app.requests.length = 0;
    app.whoami = () => ({ status: 401, body: { error: { message: 'no' } } });
    const refused = io();
    expect(
      await runApi(
        { method: 'GET', path: '/api/auth/whoami', header: [] },
        refused.io,
      ),
    ).toBe(3);
    expect(app.count('GET', '/api/auth/whoami')).toBe(2);
    expect(app.count('POST', '/api/oauth/token')).toBe(1);
  });

  it('sends nothing to another app URL and says where the login is', async () => {
    writeCredentials({ [app.issuer]: stored() });
    process.env.WALKEROS_APP_URL = 'https://staging.example.dev';
    const run = io();
    expect(
      await runApi(
        { method: 'GET', path: '/api/projects', header: [] },
        run.io,
      ),
    ).toBe(3);
    expect(run.err()).toBe(
      `walkeros api: signed in to ${app.issuer}, not https://staging.example.dev: run walkeros login\n`,
    );
  });
});

/** A refresh token the fake app will accept once. */
async function mintRefreshToken(): Promise<string> {
  const pkce = createPkce();
  const state = createState();
  const discovery = await discover(app.issuer);
  const authorize = authorizeUrl(discovery, {
    redirectUri: discovery.codePage,
    challenge: pkce.challenge,
    state,
  });
  const back = new URL(
    (await fetch(authorize, { redirect: 'manual' })).headers.get('location') ??
      '',
  );
  const answer = await app.token({
    grant_type: 'authorization_code',
    client_id: discovery.clientId,
    code: back.searchParams.get('code') ?? '',
    redirect_uri: discovery.codePage,
    code_verifier: pkce.verifier,
  });
  app.requests.length = 0;
  const body = answer.body;
  if (
    typeof body !== 'object' ||
    body === null ||
    !('refresh_token' in body) ||
    typeof body.refresh_token !== 'string'
  )
    throw new Error('the fake app minted no refresh token');
  return body.refresh_token;
}
