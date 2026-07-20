/**
 * `walkeros observe start <flowId>` - thin client of the app's observe-session
 * mint boundary.
 *
 * Env-injection only: tests set WALKEROS_* env vars and replace
 * `globalThis.fetch` with a router closure; no module mocks. The command sends
 * and renders the CURRENT generated API contract
 * (`CreateObserveSessionRequest { settingsName, replace?, level? }`,
 * `ObserveSessionResponse { ..., web: { activationUrl, credential, ... },
 * server: { endpoint, env }, expiresAt, recordsReceived }`). The pins assert
 * the CLI renders exactly what the contract carries - the app-minted
 * activation URL (which rides the elbObserve companion), the web credential,
 * the server env trio, the expiry deadline, and the record count - and reads
 * the server part from `server.env`/`server.endpoint`, never the transitional
 * top-level `serverEndpoint` mirror.
 */
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { components } from '../../../types/api.gen.js';
import {
  startObserveSession,
  formatObserveSession,
  observeStartCommand,
} from '../index.js';

type ObserveSessionResponse = components['schemas']['ObserveSessionResponse'];

// === Env-injection harness ===

const ENV_KEYS = [
  'WALKEROS_APP_URL',
  'WALKEROS_TOKEN',
  'WALKEROS_PROJECT_ID',
  'XDG_CONFIG_HOME',
] as const;

const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> =
  {};
const realFetch = globalThis.fetch;

interface RecordedCall {
  url: string;
  method: string;
  body: unknown;
}

/** Replace globalThis.fetch with a router; returns the recorded calls. */
function installFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): RecordedCall[] {
  const calls: RecordedCall[] = [];
  globalThis.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    calls.push({
      url,
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    });
    return handler(url, init);
  };
  return calls;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status });
}

// === Fixtures (shaped by the CURRENT ObserveSessionResponse contract) ===

const ACTIVATION_URL =
  'https://shop.example/?elbPreview=eyJncjRudA.gr4nt.s1g&elbObserve=obsw_pb1.ses_abc123.webtok';
const CREDENTIAL = 'obsw_pb1.ses_abc123.webtok';
const SERVER_ENDPOINT = 'https://obs-ses-abc123.containers.test';

const liveSession: ObserveSessionResponse = {
  id: 'ses_abc123',
  projectId: 'proj_test',
  flowId: 'fl_1',
  status: 'live',
  errorMessage: null,
  configSnapshot: {},
  observedFlowName: 'web',
  serverFlowName: 'server',
  // Transitional mirror of server.endpoint; the CLI must not consume it.
  serverEndpoint: SERVER_ENDPOINT,
  web: {
    activationUrl: ACTIVATION_URL,
    credential: CREDENTIAL,
    previewEnabled: true,
    bundleUrl: 'https://cdn.test/preview/proj_test/walker.k9x2m4p7abcd.js',
  },
  server: {
    endpoint: SERVER_ENDPOINT,
    env: {
      WALKEROS_OBSERVER_URL: 'https://observer.test',
      WALKEROS_DEPLOYMENT_ID: 'ses_abc123',
      WALKEROS_INGEST_TOKEN: 'srv_ingest_tok',
    },
  },
  expiresAt: '2026-07-19T00:00:00.000Z',
  recordsReceived: 42,
  createdBy: 'user_1',
  createdAt: '2026-07-18T00:00:00.000Z',
};

const armingSession: ObserveSessionResponse = {
  ...liveSession,
  status: 'arming',
  serverEndpoint: null,
  web: null,
  server: null,
  recordsReceived: 0,
};

const failedSession: ObserveSessionResponse = {
  ...armingSession,
  status: 'failed',
  errorMessage: 'container provision timed out',
};

const unauthorizedBody = {
  error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
};

beforeEach(() => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  process.env.WALKEROS_APP_URL = 'https://app.test';
  process.env.WALKEROS_TOKEN = 'tok_test';
  process.env.WALKEROS_PROJECT_ID = 'proj_test';
  // Point config reads at an empty dir so a real ~/.config/walkeros login on
  // the dev machine can never leak into these tests.
  process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), 'observe-cli-'));
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = savedEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  globalThis.fetch = realFetch;
  process.exitCode = undefined;
  jest.restoreAllMocks();
});

// === Formatter ===

describe('formatObserveSession', () => {
  it('renders the web block from a live session: activation URL, credential, bundle URL', () => {
    const { stderr } = formatObserveSession(liveSession);
    expect(stderr).toContain('ses_abc123');
    expect(stderr).toContain('live');
    // The app-minted activation URL is echoed verbatim; it already carries the
    // elbObserve companion, so the credential rides the link.
    expect(stderr).toContain(ACTIVATION_URL);
    expect(stderr).toContain('elbObserve=');
    expect(stderr).toContain(CREDENTIAL);
    expect(stderr).toContain(
      'https://cdn.test/preview/proj_test/walker.k9x2m4p7abcd.js',
    );
  });

  it('renders the server env trio, expiry, and record count from the contract', () => {
    const { stderr } = formatObserveSession(liveSession);
    expect(stderr).toContain('WALKEROS_OBSERVER_URL=https://observer.test');
    expect(stderr).toContain('WALKEROS_DEPLOYMENT_ID=ses_abc123');
    expect(stderr).toContain('WALKEROS_INGEST_TOKEN=srv_ingest_tok');
    expect(stderr).toContain('2026-07-19T00:00:00.000Z');
    expect(stderr).toContain('42');
  });

  it('consumes server.endpoint, never the transitional top-level serverEndpoint', () => {
    // A divergent fixture proves which field the CLI reads. The app mirrors
    // server.endpoint onto serverEndpoint for published consumers; this CLI
    // consumes the new shape.
    const divergent: ObserveSessionResponse = {
      ...liveSession,
      serverEndpoint: 'https://legacy.transitional.test',
    };
    const { stdoutLast, stderr } = formatObserveSession(divergent);
    expect(stdoutLast).toBe(SERVER_ENDPOINT);
    expect(stderr).toContain(SERVER_ENDPOINT);
    expect(stderr).not.toContain('https://legacy.transitional.test');
  });

  it('points at a redeploy when the web deployment cannot verify grants', () => {
    const withoutPreview: ObserveSessionResponse = {
      ...liveSession,
      web: liveSession.web
        ? { ...liveSession.web, activationUrl: null, previewEnabled: false }
        : null,
    };
    const { stderr } = formatObserveSession(withoutPreview);
    expect(stderr).toContain('redeploy');
    expect(stderr).not.toContain('null');
  });

  it('renders an arming session without printing null', () => {
    const { stdoutLast, stderr } = formatObserveSession(armingSession);
    expect(stderr).toContain('arming');
    expect(stderr).not.toContain('null');
    expect(stdoutLast).toBeNull();
  });

  it('renders a failed session with its error message', () => {
    const { stdoutLast, stderr } = formatObserveSession(failedSession);
    expect(stderr).toContain('failed');
    expect(stderr).toContain('container provision timed out');
    expect(stdoutLast).toBeNull();
  });

  it('states once that sessions idle out server-side', () => {
    const { stderr } = formatObserveSession(liveSession);
    expect(stderr.match(/idle out server-side/g)).toHaveLength(1);
  });
});

// === Programmatic mint ===

describe('startObserveSession', () => {
  it('POSTs settingsName, replace, and level to the observe-sessions mint route', async () => {
    const calls = installFetch(() => json(armingSession, 201));
    const result = await startObserveSession({
      projectId: 'proj_x',
      flowId: 'fl_1',
      settingsName: 'demo',
      replace: true,
      level: 'trace',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      'https://app.test/api/projects/proj_x/flows/fl_1/observe-sessions',
    );
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.body).toEqual({
      settingsName: 'demo',
      replace: true,
      level: 'trace',
    });
    expect(result).toEqual(armingSession);
  });

  it('falls back to WALKEROS_PROJECT_ID and omits replace/level when not set', async () => {
    const calls = installFetch(() => json(armingSession, 201));
    await startObserveSession({ flowId: 'fl_1', settingsName: 'demo' });
    expect(calls[0]?.url).toBe(
      'https://app.test/api/projects/proj_test/flows/fl_1/observe-sessions',
    );
    expect(calls[0]?.body).toEqual({ settingsName: 'demo' });
  });

  it('throws an ApiError carrying the HTTP status on failure', async () => {
    installFetch(() =>
      json(
        { error: { code: 'CONFLICT', message: 'Flow topology not supported' } },
        409,
      ),
    );
    await expect(
      startObserveSession({ flowId: 'fl_1', settingsName: 'demo' }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      message: 'Flow topology not supported',
    });
  });
});

// === Command ===

describe('observeStartCommand', () => {
  let stderrSpy: jest.SpyInstance;
  let stdoutSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  const stderrText = () =>
    stderrSpy.mock.calls.map((call) => String(call[0])).join('');
  const stdoutText = () =>
    stdoutSpy.mock.calls.map((call) => String(call[0])).join('');
  // handleCliError prints its machine-readable line via console.error.
  const consoleErrorText = () =>
    consoleErrorSpy.mock.calls.map((call) => String(call[0])).join('\n');

  beforeEach(() => {
    stderrSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    stdoutSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    // A wrong code path calling process.exit must fail the test, not kill the
    // jest worker.
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${String(code)})`);
    });
  });

  it('mints, waits for the session to settle, and prints the session blocks', async () => {
    let sessionGets = 0;
    const calls = installFetch((url, init) => {
      if (url.endsWith('/observe-sessions') && init?.method === 'POST') {
        return json(armingSession, 201);
      }
      if (url.endsWith('/heartbeat') && init?.method === 'POST') {
        return json({ ok: true }, 200);
      }
      if (url.endsWith('/observe-sessions/ses_abc123')) {
        sessionGets += 1;
        return json(sessionGets === 1 ? armingSession : liveSession, 200);
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    await observeStartCommand('fl_1', { flow: 'demo', pollIntervalMs: 0 });

    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.body).toEqual({ settingsName: 'demo' });
    // Poll loop kept going until the session left `arming`.
    expect(sessionGets).toBeGreaterThanOrEqual(2);
    const err = stderrText();
    expect(err).toContain('ses_abc123');
    expect(err).toContain(ACTIVATION_URL);
    expect(err).toContain('WALKEROS_INGEST_TOKEN=srv_ingest_tok');
    expect(err).toContain(SERVER_ENDPOINT);
    expect(stdoutText()).toContain(SERVER_ENDPOINT);
    expect(exitSpy).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
  });

  it('heartbeats the session on each wait poll tick', async () => {
    let sessionGets = 0;
    const calls = installFetch((url, init) => {
      if (url.endsWith('/observe-sessions') && init?.method === 'POST') {
        return json(armingSession, 201);
      }
      if (url.endsWith('/heartbeat') && init?.method === 'POST') {
        return json({ ok: true }, 200);
      }
      if (url.endsWith('/observe-sessions/ses_abc123')) {
        sessionGets += 1;
        return json(sessionGets < 3 ? armingSession : liveSession, 200);
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    await observeStartCommand('fl_1', { flow: 'demo', pollIntervalMs: 0 });

    const heartbeats = calls.filter(
      (call) =>
        call.method === 'POST' &&
        call.url ===
          'https://app.test/api/projects/proj_test/flows/fl_1/observe-sessions/ses_abc123/heartbeat',
    );
    // One heartbeat per poll tick keeps the session out of janitor reach
    // while the user is actively setting up.
    expect(heartbeats.length).toBeGreaterThanOrEqual(3);
  });

  it('a failing heartbeat never gates the poll: the session still settles', async () => {
    let sessionGets = 0;
    installFetch((url, init) => {
      if (url.endsWith('/observe-sessions') && init?.method === 'POST') {
        return json(armingSession, 201);
      }
      if (url.endsWith('/heartbeat') && init?.method === 'POST') {
        // Heartbeat extends grace, never gates: a 500 here must not surface.
        return json({ error: { code: 'INTERNAL', message: 'boom' } }, 500);
      }
      if (url.endsWith('/observe-sessions/ses_abc123')) {
        sessionGets += 1;
        return json(sessionGets === 1 ? armingSession : liveSession, 200);
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    await observeStartCommand('fl_1', { flow: 'demo', pollIntervalMs: 0 });

    expect(stderrText()).toContain(SERVER_ENDPOINT);
    expect(process.exitCode).toBeUndefined();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('with --no-wait sends no heartbeat: liveness never depends on this process', async () => {
    const calls = installFetch((url, init) => {
      if (url.endsWith('/observe-sessions') && init?.method === 'POST') {
        return json(armingSession, 201);
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    await observeStartCommand('fl_1', {
      flow: 'demo',
      wait: false,
      pollIntervalMs: 0,
    });

    expect(calls).toHaveLength(1);
    expect(calls.some((call) => call.url.endsWith('/heartbeat'))).toBe(false);
  });

  it('maps --replace onto the contract replace field', async () => {
    const calls = installFetch((url, init) => {
      if (url.endsWith('/observe-sessions') && init?.method === 'POST') {
        return json(armingSession, 201);
      }
      if (url.endsWith('/heartbeat')) return json({ ok: true }, 200);
      return json(liveSession, 200);
    });

    await observeStartCommand('fl_1', {
      flow: 'demo',
      replace: true,
      pollIntervalMs: 0,
    });

    expect(calls[0]?.body).toEqual({ settingsName: 'demo', replace: true });
  });

  it('sends --level through to the mint body', async () => {
    const calls = installFetch((url, init) => {
      if (url.endsWith('/observe-sessions') && init?.method === 'POST') {
        return json(armingSession, 201);
      }
      if (url.endsWith('/heartbeat')) return json({ ok: true }, 200);
      return json(liveSession, 200);
    });

    await observeStartCommand('fl_1', {
      flow: 'demo',
      level: 'trace',
      pollIntervalMs: 0,
    });

    expect(calls[0]?.body).toEqual({ settingsName: 'demo', level: 'trace' });
  });

  it('rejects an invalid --level loudly before any network call', async () => {
    const calls = installFetch(() => json(armingSession, 201));

    await expect(
      observeStartCommand('fl_1', {
        flow: 'demo',
        level: 'full',
        pollIntervalMs: 0,
      }),
    ).rejects.toThrow('process.exit(1)');

    expect(calls).toHaveLength(0);
    expect(consoleErrorText()).toContain('Invalid --level');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('resolves the settings name from the flow when --flow is omitted and only one exists', async () => {
    const calls = installFetch((url, init) => {
      if (url.includes('/flows/fl_1') && !url.includes('observe-sessions')) {
        return json(
          {
            id: 'fl_1',
            name: 'Demo flow',
            config: {},
            settings: [{ id: 'fs_1', name: 'production' }],
            createdAt: '2026-07-18T00:00:00.000Z',
            updatedAt: '2026-07-18T00:00:00.000Z',
            deletedAt: null,
          },
          200,
        );
      }
      if (url.endsWith('/observe-sessions') && init?.method === 'POST') {
        return json(armingSession, 201);
      }
      if (url.endsWith('/heartbeat')) return json({ ok: true }, 200);
      return json(liveSession, 200);
    });

    await observeStartCommand('fl_1', { pollIntervalMs: 0 });

    const mint = calls.find(
      (call) => call.method === 'POST' && !call.url.endsWith('/heartbeat'),
    );
    expect(mint?.body).toEqual({ settingsName: 'production' });
  });

  it('with a token, a 401 fails loudly via the machine error line, not the CTA', async () => {
    // Stale/invalid credentials (the CI case): a script must see a failure,
    // never success-with-empty-stdout. The signup CTA is only for the
    // no-token-at-all funnel.
    installFetch(() => json(unauthorizedBody, 401));

    await expect(
      observeStartCommand('fl_1', { flow: 'demo', pollIntervalMs: 0 }),
    ).rejects.toThrow('process.exit(1)');

    expect(consoleErrorText()).toContain('error: code=UNAUTHORIZED');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(stderrText()).not.toContain('walkeros auth login');
  });

  it('missing token prints the CTA without any network call, exit stays clean', async () => {
    delete process.env.WALKEROS_TOKEN;
    const calls = installFetch(() => json(unauthorizedBody, 401));

    await observeStartCommand('fl_1', { flow: 'demo', pollIntervalMs: 0 });

    expect(calls).toHaveLength(0);
    expect(stderrText()).toContain('walkeros auth login');
    // Non-fatal funnel: no exit call, no failure exit code, no machine error line.
    expect(exitSpy).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('is loud when --timeout expires with the session still arming', async () => {
    installFetch((url, init) => {
      if (url.endsWith('/observe-sessions') && init?.method === 'POST') {
        return json(armingSession, 201);
      }
      if (url.endsWith('/heartbeat')) return json({ ok: true }, 200);
      return json(armingSession, 200);
    });

    await observeStartCommand('fl_1', {
      flow: 'demo',
      timeout: '0',
      pollIntervalMs: 0,
    });

    const err = stderrText();
    // The still-arming state is rendered, but the expiry is explicit and the
    // exit must not read as success.
    expect(err).toContain('arming');
    expect(err).toContain('Timed out after 0s');
    expect(process.exitCode).toBe(1);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric --timeout loudly before any network call', async () => {
    const calls = installFetch(() => json(armingSession, 201));

    await expect(
      observeStartCommand('fl_1', {
        flow: 'demo',
        timeout: 'soon',
        pollIntervalMs: 0,
      }),
    ).rejects.toThrow('process.exit(1)');

    expect(calls).toHaveLength(0);
    expect(consoleErrorText()).toContain('Invalid --timeout');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('rejects a partially-numeric or empty --timeout (no silent truncation)', async () => {
    // parseInt would read `10seconds` as 10; a unit typo like `5m` must not
    // silently become 5 seconds. Empty and non-finite values are equally out.
    for (const bad of ['10seconds', '5m', '', '  ', 'Infinity']) {
      // Each case must prove its own rejection: the spies accumulate across
      // iterations, so a stale message from a prior case could mask a miss.
      consoleErrorSpy.mockClear();
      exitSpy.mockClear();
      const calls = installFetch(() => json(armingSession, 201));

      await expect(
        observeStartCommand('fl_1', {
          flow: 'demo',
          timeout: bad,
          pollIntervalMs: 0,
        }),
      ).rejects.toThrow('process.exit(1)');

      expect(calls).toHaveLength(0);
      expect(consoleErrorText()).toContain('Invalid --timeout');
      expect(exitSpy).toHaveBeenCalledWith(1);
    }
  });

  it('sets a non-zero exit code when the session settles failed', async () => {
    installFetch((url, init) => {
      if (url.endsWith('/observe-sessions') && init?.method === 'POST') {
        return json(armingSession, 201);
      }
      if (url.endsWith('/heartbeat')) return json({ ok: true }, 200);
      return json(failedSession, 200);
    });

    await observeStartCommand('fl_1', { flow: 'demo', pollIntervalMs: 0 });

    expect(stderrText()).toContain('container provision timed out');
    expect(process.exitCode).toBe(1);
    // exitCode over process.exit: the message still prints and jest survives.
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('with --no-wait renders the mint response as-is without polling', async () => {
    const calls = installFetch((url, init) => {
      if (url.endsWith('/observe-sessions') && init?.method === 'POST') {
        return json(armingSession, 201);
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    await observeStartCommand('fl_1', {
      flow: 'demo',
      wait: false,
      pollIntervalMs: 0,
    });

    expect(calls).toHaveLength(1);
    expect(stderrText()).toContain('arming');
    // Opting out of waiting is not a timeout: exit stays clean.
    expect(stderrText()).not.toContain('Timed out');
    expect(process.exitCode).toBeUndefined();
  });
});
