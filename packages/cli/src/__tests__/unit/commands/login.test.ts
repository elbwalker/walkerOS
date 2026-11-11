import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'fs';
import { createServer } from 'http';
import { tmpdir } from 'os';
import { join } from 'path';
import { PassThrough, Writable } from 'stream';
import {
  runLogin,
  runLogout,
  type LoginIO,
  type LoginOptions,
} from '../../../commands/login/index.js';
import type { OpenResult } from '../../../core/browser-opener.js';
import {
  getCredentialsPath,
  writeCredentials,
  writePending,
  type StoredLogin,
} from '../../../lib/credentials.js';
import {
  allowAt,
  startFakeApp,
  type FakeApp,
} from '../../helpers/fake-oauth-app.js';

const env = process.env;
let app: FakeApp;
let configHome: string;

const configDir = () => join(configHome, 'walkeros');

function sink() {
  const chunks: Buffer[] = [];
  let changed: () => void = () => {};
  const stream = new Writable({
    write(chunk: Buffer, _encoding, done) {
      chunks.push(Buffer.from(chunk));
      changed();
      done();
    },
  });
  const text = () => Buffer.concat(chunks).toString('utf-8');
  /** Resolves once the output matches. */
  const waitFor = (pattern: RegExp) =>
    new Promise<RegExpExecArray>((resolve) => {
      const check = () => {
        const match = pattern.exec(text());
        if (match) resolve(match);
      };
      changed = check;
      check();
    });
  return { stream, text, waitFor };
}

/** The address the CLI printed for the browser. */
const PRINTED_URL = /^(http:\/\/127\.0\.0\.1:\d+\/oauth\/authorize\?\S+)$/m;

interface Run {
  io: LoginIO;
  out: ReturnType<typeof sink>;
  err: ReturnType<typeof sink>;
  stdin: PassThrough;
  opened: string[];
}

/**
 * The person's side. By default the "browser" opens the address, Allows at
 * once and follows the app back to the return address, as a real one would.
 */
function person(
  overrides: Partial<LoginIO> = {},
  browser: (url: string) => Promise<void> = followToListener,
): Run {
  const out = sink();
  const err = sink();
  const stdin = new PassThrough();
  const opened: string[] = [];
  const io: LoginIO = {
    stdout: out.stream,
    stderr: err.stream,
    stdin,
    interactive: false,
    callbackTimeoutMs: 10_000,
    open: async (url: string): Promise<OpenResult> => {
      opened.push(url);
      void browser(url);
      return { kind: 'opened' };
    },
    ...overrides,
  };
  return { io, out, err, stdin, opened };
}

async function followToListener(url: string): Promise<void> {
  const back = await allowAt(url);
  const answer = await fetch(back, { redirect: 'manual' });
  const location = answer.headers.get('location');
  if (location !== null) await fetch(new URL(location, back));
}

function fileLogins(): Record<string, StoredLogin> {
  return JSON.parse(readFileSync(getCredentialsPath(), 'utf-8'));
}

const pendingFiles = () =>
  existsSync(configDir())
    ? readdirSync(configDir()).filter((name) => name.startsWith('pending-'))
    : [];

const tokenRequests = () => app.count('POST', '/api/oauth/token');

/** Everything the run printed holds none of the secrets the app handed out. */
function printsNoSecret(run: Run): void {
  const printed = run.out.text() + run.err.text();
  for (const token of app.liveAccess) expect(printed).not.toContain(token);
  for (const request of app.requests) {
    for (const key of ['code', 'code_verifier', 'refresh_token', 'token'])
      if (request.form[key]) expect(printed).not.toContain(request.form[key]);
  }
}

beforeEach(async () => {
  app = await startFakeApp();
  configHome = mkdtempSync(join(tmpdir(), 'walkeros-login-cmd-'));
  process.env = {
    ...env,
    XDG_CONFIG_HOME: configHome,
    WALKEROS_APP_URL: app.issuer,
  };
  delete process.env.WALKEROS_TOKEN;
  delete process.env.WALKEROS_LOGIN_PORT;
  delete process.env.BROWSER;
});

afterEach(async () => {
  process.env = env;
  await app.close();
  rmSync(configHome, { recursive: true, force: true });
});

const BROWSER: LoginOptions = { browser: true };
const NO_BROWSER: LoginOptions = { browser: false };

describe('walkeros login in a browser on this machine', () => {
  it('finishes by itself on the loopback and keeps the login bound to its issuer', async () => {
    const run = person();
    expect(await runLogin(BROWSER, run.io)).toBe(0);

    expect(run.out.text()).toContain(
      'If the browser shows a connection error, run walkeros login --no-browser\n',
    );
    expect(run.out.text()).toContain(`Signed in to ${app.issuer}.`);
    const exchange = app.requests.find((r) => r.path === '/api/oauth/token');
    const redirectUri = new URL(run.opened[0]).searchParams.get('redirect_uri');
    expect(redirectUri).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/callback$/);
    expect(Object.keys(exchange?.form ?? {}).sort()).toEqual([
      'client_id',
      'code',
      'code_verifier',
      'grant_type',
      'redirect_uri',
    ]);
    expect(exchange?.form.redirect_uri).toBe(redirectUri);

    const login = fileLogins()[app.issuer];
    expect(login).toMatchObject({
      issuer: app.issuer,
      client_id: `${app.issuer}/oauth/walkeros-cli`,
      token_endpoint: `${app.issuer}/api/oauth/token`,
      revocation_endpoint: `${app.issuer}/api/oauth/revoke`,
    });
    expect(app.liveAccess.has(login.access_token)).toBe(true);
    expect(statSync(getCredentialsPath()).mode & 0o777).toBe(0o600);
    printsNoSecret(run);
  });

  it('listens on --port, else on WALKEROS_LOGIN_PORT', async () => {
    const free = async () => {
      const probe = createServer();
      await new Promise<void>((resolve) =>
        probe.listen(0, '127.0.0.1', resolve),
      );
      const address = probe.address();
      await new Promise((resolve) => probe.close(resolve));
      return address !== null && typeof address === 'object' ? address.port : 0;
    };
    const [flag, variable] = [await free(), await free()];
    process.env.WALKEROS_LOGIN_PORT = String(variable);

    const viaFlag = person();
    expect(
      await runLogin({ browser: true, port: String(flag) }, viaFlag.io),
    ).toBe(0);
    const viaEnv = person();
    expect(await runLogin(BROWSER, viaEnv.io)).toBe(0);

    const portOf = (r: Run) =>
      new URL(new URL(r.opened[0]).searchParams.get('redirect_uri') ?? '').port;
    expect([portOf(viaFlag), portOf(viaEnv)]).toEqual([
      String(flag),
      String(variable),
    ]);
  });

  it('gives up after its wait, naming --no-browser', async () => {
    const run = person({ callbackTimeoutMs: 300 }, async () => {});
    expect(await runLogin(BROWSER, run.io)).toBe(1);
    expect(run.err.text()).toContain('run walkeros login --no-browser');
    expect(tokenRequests()).toBe(0);
  });

  it('names --no-browser when no browser can be started, and still prints the address', async () => {
    const run = person({
      open: async () => ({
        kind: 'failed',
        reason: 'xdg-open: spawn xdg-open ENOENT',
      }),
      callbackTimeoutMs: 300,
    });
    expect(await runLogin(BROWSER, run.io)).toBe(1);
    expect(run.err.text()).toContain(
      'walkeros login: could not open a browser (xdg-open: spawn xdg-open ENOENT): run walkeros login --no-browser\n',
    );
    expect(run.out.text()).toMatch(PRINTED_URL);
  });

  it.each([
    [
      'another issuer',
      () => (app.metadata.issuer = 'http://127.0.0.1:1'),
      'name another issuer',
    ],
    [
      'an authorization endpoint on another origin',
      () =>
        (app.metadata.authorization_endpoint =
          'https://evil.example/a?x=1&calc'),
      'authorization_endpoint https://evil.example/a?x=1&calc is not on',
    ],
    [
      'an authorization endpoint that is a file',
      () => (app.metadata.authorization_endpoint = 'file:///etc/passwd'),
      'authorization_endpoint file:///etc/passwd is neither https nor http on this machine',
    ],
    [
      'a token endpoint on another origin',
      () => (app.metadata.token_endpoint = 'https://evil.example/token'),
      'token_endpoint https://evil.example/token is not on',
    ],
    [
      'a revocation endpoint over plain http to another host',
      () => (app.metadata.revocation_endpoint = 'http://evil.example/revoke'),
      'revocation_endpoint http://evil.example/revoke is neither https nor http on this machine',
    ],
    [
      'another client id',
      () =>
        (app.clientDocument.client_id =
          'https://app.walkeros.io/oauth/walkeros-cli'),
      'does not serve the walkerOS CLI client',
    ],
    [
      'no code page on the issuer',
      () =>
        (app.clientDocument.redirect_uris = [
          'http://127.0.0.1/callback',
          'https://evil.example/oauth/cli-code',
        ]),
      'does not register the loopback and a code page',
    ],
    [
      'an app URL over plain http to another host',
      () => (process.env.WALKEROS_APP_URL = 'http://app.example.test'),
      'signs in only over https, or http on this machine',
    ],
  ])(
    'stops on %s before any token request, opening nothing',
    async (_name, change, fact) => {
      change();
      const run = person();
      expect(await runLogin(BROWSER, run.io)).toBe(1);
      expect(run.opened).toEqual([]);
      expect(tokenRequests()).toBe(0);
      expect(existsSync(getCredentialsPath())).toBe(false);
      expect(run.err.text()).toContain(fact);
      expect(run.err.text()).toMatch(/^walkeros login: .+: check the app URL/);
    },
  );

  it('says WALKEROS_TOKEN keeps winning while it is set', async () => {
    process.env.WALKEROS_TOKEN = 'wos_pat_env';
    const run = person();
    expect(await runLogin(BROWSER, run.io)).toBe(0);
    expect(run.err.text()).toContain(
      'walkeros login: WALKEROS_TOKEN is set and is used instead of this sign-in until it is unset\n',
    );
  });

  it('warns when others can write to the config directory', async () => {
    mkdirSync(configDir(), { recursive: true });
    chmodSync(configDir(), 0o777);
    const run = person();
    expect(await runLogin(BROWSER, run.io)).toBe(0);
    expect(run.err.text()).toContain(
      `walkeros login: ${configDir()} can be written by other users, who could replace your sign-in there: run chmod 700 ${configDir()}\n`,
    );
  });

  it('revokes the login it replaces', async () => {
    expect(await runLogin(BROWSER, person().io)).toBe(0);
    const first = fileLogins()[app.issuer];
    expect(await runLogin(BROWSER, person().io)).toBe(0);
    const revoked = app.requests.filter((r) => r.path === '/api/oauth/revoke');
    expect(revoked.map((r) => r.form)).toEqual([
      {
        client_id: first.client_id,
        token: first.refresh_token,
        token_type_hint: 'refresh_token',
      },
    ]);
    expect(fileLogins()[app.issuer].refresh_token).not.toBe(
      first.refresh_token,
    );
  });
});

describe('walkeros login --no-browser', () => {
  it('on a terminal prints the address, asks for the code and exchanges it at the code page', async () => {
    const run = person({ interactive: true });
    const done = runLogin(NO_BROWSER, run.io);
    const [, url] = await run.out.waitFor(PRINTED_URL);
    expect(run.out.text()).toContain(
      'It works once, within 5 minutes of Allow.',
    );
    const back = await allowAt(url);
    expect(`${back.origin}${back.pathname}`).toBe(
      `${app.issuer}/oauth/cli-code`,
    );
    run.stdin.write(
      `${back.searchParams.get('code')}.${back.searchParams.get('state')}\n`,
    );
    expect(await done).toBe(0);
    expect(
      app.requests.find((r) => r.path === '/api/oauth/token')?.form
        .redirect_uri,
    ).toBe(`${app.issuer}/oauth/cli-code`);
    expect(pendingFiles()).toEqual([]);
    expect(fileLogins()[app.issuer]).toBeDefined();
    printsNoSecret(run);
  });

  it('without a terminal leaves one 0600 pending file and names walkeros login --code', async () => {
    const run = person();
    expect(await runLogin(NO_BROWSER, run.io)).toBe(0);
    expect(run.out.text()).toContain(
      'When the page shows a code, run: walkeros login --code <code>\n',
    );
    expect(run.out.text()).toContain(
      'The code works once, within 5 minutes of Allow',
    );
    expect(tokenRequests()).toBe(0);

    const [name] = pendingFiles();
    const state = new URL(
      PRINTED_URL.exec(run.out.text())?.[1] ?? '',
    ).searchParams.get('state');
    expect(name).toBe(`pending-${state}.json`);
    const path = join(configDir(), name);
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(Object.keys(JSON.parse(readFileSync(path, 'utf-8'))).sort()).toEqual(
      [
        'client_id',
        'code_verifier',
        'created_at',
        'issuer',
        'redirect_uri',
        'state',
        'token_endpoint',
      ],
    );
  });

  it('removes expired pending sign-ins on the next login', async () => {
    writePending({
      code_verifier: 'v',
      state: 'oldstate',
      redirect_uri: `${app.issuer}/oauth/cli-code`,
      issuer: app.issuer,
      client_id: `${app.issuer}/oauth/walkeros-cli`,
      token_endpoint: `${app.issuer}/api/oauth/token`,
      created_at: Date.now() - 16 * 60 * 1000,
    });
    expect(await runLogin(NO_BROWSER, person().io)).toBe(0);
    expect(pendingFiles()).toHaveLength(1);
    expect(pendingFiles()).not.toContain('pending-oldstate.json');
  });
});

describe('walkeros login --code', () => {
  /** Start without a terminal, Allow, and read the code the page shows. */
  async function started(): Promise<string> {
    const run = person();
    expect(await runLogin(NO_BROWSER, run.io)).toBe(0);
    const back = await allowAt(PRINTED_URL.exec(run.out.text())?.[1] ?? '');
    app.requests.length = 0;
    return `${back.searchParams.get('code')}.${back.searchParams.get('state')}`;
  }

  it('sends one exchange for two runs with the same code at once; the second finds nothing waiting', async () => {
    const pasted = await started();
    const exchange = app.token;
    // Hold the answer, so the second run reaches the lock while the first holds it.
    app.token = async (form) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return exchange(form);
    };
    const [a, b] = [person(), person()];
    const exits = await Promise.all([
      runLogin({ browser: true, code: pasted }, a.io),
      runLogin({ browser: true, code: pasted }, b.io),
    ]);
    expect(exits.sort()).toEqual([0, 1]);
    expect(tokenRequests()).toBe(1);
    expect(a.err.text() + b.err.text()).toBe(
      'walkeros login: no sign-in is waiting for this code (it was used, or it expired): run walkeros login --no-browser to start a new one\n',
    );
    expect(app.liveAccess.has(fileLogins()[app.issuer].access_token)).toBe(
      true,
    );
  });

  it('finishes the pending sign-in once; the second use is refused before any request', async () => {
    const pasted = await started();
    const first = person();
    expect(await runLogin({ browser: true, code: pasted }, first.io)).toBe(0);
    expect(first.out.text()).toContain(`Signed in to ${app.issuer}.`);
    expect(pendingFiles()).toEqual([]);
    expect(tokenRequests()).toBe(1);
    printsNoSecret(first);

    const second = person();
    expect(await runLogin({ browser: true, code: pasted }, second.io)).toBe(1);
    expect(second.err.text()).toBe(
      'walkeros login: no sign-in is waiting for this code (it was used, or it expired): run walkeros login --no-browser to start a new one\n',
    );
    expect(tokenRequests()).toBe(1);
  });

  it.each([
    'not-a-code',
    `${'a'.repeat(64)}`,
    `${'A'.repeat(64)}.state`,
    `${'a'.repeat(64)}.st@te`,
  ])(
    'refuses %s by its shape, without echoing it or sending anything',
    async (pasted) => {
      const run = person();
      expect(await runLogin({ browser: true, code: pasted }, run.io)).toBe(2);
      expect(run.err.text()).not.toContain(pasted);
      expect(app.requests).toEqual([]);
    },
  );

  it('on invalid_grant drops the pending sign-in and says to start again', async () => {
    const pasted = await started();
    app.token = () => ({ status: 400, body: { error: 'invalid_grant' } });
    const run = person();
    expect(await runLogin({ browser: true, code: pasted }, run.io)).toBe(1);
    expect(run.err.text()).toContain('run walkeros login --no-browser again');
    expect(pendingFiles()).toEqual([]);
  });

  it('keeps the pending sign-in when the app cannot be reached before the exchange', async () => {
    const pasted = await started();
    const metadata = app.metadata;
    app.metadata = {};
    const run = person();
    expect(await runLogin({ browser: true, code: pasted }, run.io)).toBe(1);
    expect(run.err.text()).toContain(
      'the code is not used yet: run the same walkeros login --code again',
    );
    expect(tokenRequests()).toBe(0);
    expect(pendingFiles()).toHaveLength(1);

    app.metadata = metadata;
    expect(await runLogin({ browser: true, code: pasted }, person().io)).toBe(
      0,
    );
  });

  it('keeps the pending sign-in when the answer is lost on the network', async () => {
    const pasted = await started();
    app.token = () => ({ status: 0, drop: true });
    const run = person();
    expect(await runLogin({ browser: true, code: pasted }, run.io)).toBe(1);
    expect(run.err.text()).toContain(
      'run the same walkeros login --code again',
    );
    expect(pendingFiles()).toHaveLength(1);
  });
});

describe('walkeros logout', () => {
  async function signedIn(): Promise<StoredLogin> {
    expect(await runLogin(BROWSER, person().io)).toBe(0);
    app.requests.length = 0;
    return fileLogins()[app.issuer];
  }

  it('revokes the refresh token at the stored endpoint before it removes the login', async () => {
    const login = await signedIn();
    let storedDuringRevoke: unknown;
    app.revoke = () => {
      storedDuringRevoke = fileLogins()[app.issuer];
      return { status: 200 };
    };
    const run = person();
    expect(await runLogout(run.io)).toBe(0);
    expect(storedDuringRevoke).toEqual(login);
    expect(app.requests.map((r) => [r.path, r.form])).toEqual([
      [
        '/api/oauth/revoke',
        {
          client_id: login.client_id,
          token: login.refresh_token,
          token_type_hint: 'refresh_token',
        },
      ],
    ]);
    expect(fileLogins()).toEqual({});
    expect(run.out.text()).toBe(`Signed out of ${app.issuer}.\n`);
  });

  it('removes the login offline and says the sign-in still works until it is disconnected', async () => {
    await signedIn();
    app.revoke = () => ({ status: 0, drop: true });
    const run = person();
    expect(await runLogout(run.io)).toBe(1);
    expect(fileLogins()).toEqual({});
    expect(run.err.text()).toMatch(
      new RegExp(
        `^walkeros logout: could not reach ${app.issuer.replace(/[.]/g, '\\.')} \\(.+\\): the sign-in still works until you disconnect walkerOS CLI under Account, Connected apps, which signs the CLI out on every computer\\n$`,
      ),
    );
  });

  it('removes the login when the app no longer knows the client', async () => {
    await signedIn();
    app.revoke = () => ({ status: 401, body: { error: 'invalid_client' } });
    const run = person();
    expect(await runLogout(run.io)).toBe(0);
    expect(fileLogins()).toEqual({});
  });

  it('says WALKEROS_TOKEN stays in use', async () => {
    writeCredentials({});
    process.env.WALKEROS_TOKEN = 'wos_pat_env';
    const run = person();
    expect(await runLogout(run.io)).toBe(0);
    expect(run.out.text()).toBe(
      `Not signed in to ${app.issuer}.\nWALKEROS_TOKEN is set and stays in use until it is unset.\n`,
    );
  });
});
