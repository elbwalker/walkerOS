import { mkdtempSync, rmSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { login } from '../../../commands/login/index.js';
import {
  readConfig,
  writeConfig,
  getConfigPath,
} from '../../../lib/config-file.js';

const APP_URL = 'https://app.example.test';

/** Mirrors `MIN_SERVER_POLL_INTERVAL_MS` in the command under test. */
const MIN_SERVER_POLL_INTERVAL_MS = 1000;

const noopOpen = async () => {};

interface RouteState {
  /** Queued answers for the token endpoint, consumed in order. */
  tokenAnswers: Array<() => Response>;
  deviceAnswer: () => Response;
  whoamiAnswer: () => Response;
  tokenCalls: number;
  /** When each token poll went out, so pacing can be asserted. */
  tokenCallTimes: number[];
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function oauthError(error: string, status = 400): () => Response {
  return () => jsonResponse({ error, error_description: error }, status);
}

function deviceOk(interval = 0): () => Response {
  return () =>
    jsonResponse({
      device_code: 'dc_1',
      user_code: 'ABCD-EFGH',
      verification_uri: `${APP_URL}/oauth/device`,
      verification_uri_complete: `${APP_URL}/oauth/device?user_code=ABCD-EFGH`,
      expires_in: 600,
      interval,
    });
}

function tokenOk(): () => Response {
  return () =>
    jsonResponse({
      access_token: 'at_1',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'rt_1',
    });
}

function whoamiOk(email = 'user@example.test'): () => Response {
  return () => jsonResponse({ userId: 'user_1', email, projectId: null });
}

function router(state: RouteState): typeof fetch {
  return async (input) => {
    const url = String(input);
    if (url.endsWith('/api/oauth/device_authorization'))
      return state.deviceAnswer();
    if (url.endsWith('/api/oauth/token')) {
      const answer =
        state.tokenAnswers[state.tokenCalls] ??
        state.tokenAnswers[state.tokenAnswers.length - 1];
      state.tokenCalls += 1;
      state.tokenCallTimes.push(Date.now());
      if (!answer) throw new Error('no token answer configured');
      return answer();
    }
    if (url.endsWith('/api/auth/whoami')) return state.whoamiAnswer();
    throw new Error(`unexpected request to ${url}`);
  };
}

function makeState(overrides: Partial<RouteState> = {}): RouteState {
  return {
    deviceAnswer: deviceOk(),
    tokenAnswers: [tokenOk()],
    whoamiAnswer: whoamiOk(),
    tokenCalls: 0,
    tokenCallTimes: [],
    ...overrides,
  };
}

describe('login (device authorization grant)', () => {
  let dir: string;
  const originalEnv = process.env;
  let stderr: jest.SpyInstance;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'walkeros-login-'));
    process.env = { ...originalEnv };
    process.env.XDG_CONFIG_HOME = dir;
    delete process.env.WALKEROS_TOKEN;
    process.env.WALKEROS_APP_URL = APP_URL;
    stderr = jest.spyOn(process.stderr, 'write').mockReturnValue(true);
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(dir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  function stderrText(): string {
    return stderr.mock.calls.map((call) => String(call[0])).join('');
  }

  it('polls through pending and slow_down, then stores the session', async () => {
    const state = makeState({
      tokenAnswers: [
        oauthError('authorization_pending'),
        oauthError('slow_down'),
        tokenOk(),
      ],
    });

    const result = await login({
      url: APP_URL,
      pollIntervalMs: 1,
      fetch: router(state),
      openUrl: noopOpen,
    });

    expect(result).toEqual({
      success: true,
      email: 'user@example.test',
      configPath: getConfigPath(),
    });
    expect(state.tokenCalls).toBe(3);
  });

  it('paces polling at the clamped minimum when a server states an interval of zero', async () => {
    // `WALKEROS_APP_URL` is user-settable, so this number comes from whichever
    // host the person is pointed at. Unclamped, a stated zero would let a
    // remote value turn this loop into an unthrottled POST flood for the whole
    // life of the device code. No `pollIntervalMs` override here: the pacing
    // under test is exactly the one a real login would get.
    const state = makeState({
      tokenAnswers: [oauthError('authorization_pending'), tokenOk()],
    });

    const result = await login({
      url: APP_URL,
      fetch: router(state),
      openUrl: noopOpen,
      maxPollAttempts: 2,
    });

    expect(result.success).toBe(true);
    // Two polls really happened, so the elapsed time is the loop waiting and
    // not one slow request: the fetch double answers instantly.
    expect(state.tokenCalls).toBe(2);
    const [first, second] = state.tokenCallTimes;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    // The gap between them is the clamp doing its work. A hot loop puts these
    // microseconds apart.
    expect(second! - first!).toBeGreaterThanOrEqual(
      MIN_SERVER_POLL_INTERVAL_MS - 50,
    );
  });

  it('keeps a server interval that is already above the minimum', async () => {
    // The control for the clamp: it is a floor, not a replacement. Flattening
    // it to the minimum would pass the zero case above and fail here, so the
    // pair is what pins `Math.max` semantics rather than either test alone.
    const state = makeState({
      deviceAnswer: deviceOk(2),
      tokenAnswers: [oauthError('authorization_pending')],
    });

    const started = Date.now();
    await login({
      url: APP_URL,
      fetch: router(state),
      openUrl: noopOpen,
      maxPollAttempts: 1,
    });

    expect(state.tokenCalls).toBe(1);
    expect(Date.now() - started).toBeGreaterThanOrEqual(1900);
  });

  it('writes the three session fields and no legacy token', async () => {
    writeConfig({ token: 'legacy-static-token' });

    await login({
      url: APP_URL,
      pollIntervalMs: 1,
      fetch: router(makeState()),
      openUrl: noopOpen,
    });

    const stored = readConfig();
    expect(stored?.accessToken).toBe('at_1');
    expect(stored?.refreshToken).toBe('rt_1');
    expect(Date.parse(stored?.accessTokenExpiresAt ?? '')).toBeGreaterThan(
      Date.now(),
    );
    expect(stored?.token).toBeUndefined();

    // The on-disk file must not carry the key at all, not merely an undefined
    // value, or a later read would resurrect the legacy path.
    const raw: unknown = JSON.parse(readFileSync(getConfigPath(), 'utf-8'));
    expect(raw).not.toHaveProperty('token');
  });

  it('drops a previous refresh token when the server rotates none', async () => {
    writeConfig({
      accessToken: 'at_old',
      accessTokenExpiresAt: new Date(Date.now() + 1000).toISOString(),
      refreshToken: 'rt_previous_session',
    });
    const state = makeState({
      tokenAnswers: [
        () =>
          jsonResponse({
            access_token: 'at_1',
            token_type: 'Bearer',
            expires_in: 3600,
          }),
      ],
    });

    await login({
      url: APP_URL,
      pollIntervalMs: 1,
      fetch: router(state),
      openUrl: noopOpen,
    });

    expect(readConfig()?.refreshToken).toBeUndefined();
  });

  it('drops a previous email when the identity lookup fails', async () => {
    // `walkeros feedback` sends the stored address as the reporter's identity,
    // so a leftover one attributes this session to the previous account.
    writeConfig({ email: 'previous@example.test' });
    const state = makeState({
      whoamiAnswer: () => jsonResponse({ error: 'nope' }, 500),
    });

    await login({
      url: APP_URL,
      pollIntervalMs: 1,
      fetch: router(state),
      openUrl: noopOpen,
    });

    expect(readConfig()?.email).toBeUndefined();
  });

  it('preserves unrelated config that login does not own', async () => {
    writeConfig({
      defaultProjectId: 'proj_keep',
      installationId: 'install_keep',
      telemetryEnabled: true,
      anonymousFeedback: false,
    });

    await login({
      url: APP_URL,
      pollIntervalMs: 1,
      fetch: router(makeState()),
      openUrl: noopOpen,
    });

    const stored = readConfig();
    expect(stored?.defaultProjectId).toBe('proj_keep');
    expect(stored?.installationId).toBe('install_keep');
    expect(stored?.telemetryEnabled).toBe(true);
    expect(stored?.anonymousFeedback).toBe(false);
    expect(stored?.accessToken).toBe('at_1');
  });

  it('reports a timeout when the device code expires', async () => {
    const state = makeState({ tokenAnswers: [oauthError('expired_token')] });

    await expect(
      login({
        url: APP_URL,
        pollIntervalMs: 1,
        fetch: router(state),
        openUrl: noopOpen,
      }),
    ).resolves.toEqual({
      success: false,
      error: 'Authorization timed out. Please try again.',
    });
    expect(existsSync(getConfigPath())).toBe(false);
  });

  it('reports a denial distinctly from a timeout', async () => {
    // The control for the expiry test: two different terminal outcomes must
    // not collapse into the same message.
    const state = makeState({ tokenAnswers: [oauthError('access_denied')] });

    const result = await login({
      url: APP_URL,
      pollIntervalMs: 1,
      fetch: router(state),
      openUrl: noopOpen,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Authorization was denied.');
  });

  it('stops polling and reports the error on an unrecognized failure', async () => {
    const state = makeState({
      tokenAnswers: [oauthError('invalid_client', 401)],
    });

    const result = await login({
      url: APP_URL,
      pollIntervalMs: 1,
      fetch: router(state),
      openUrl: noopOpen,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('invalid_client');
    expect(state.tokenCalls).toBe(1);
  });

  it('gives up after maxPollAttempts', async () => {
    const state = makeState({
      tokenAnswers: [oauthError('authorization_pending')],
    });

    const result = await login({
      url: APP_URL,
      pollIntervalMs: 1,
      fetch: router(state),
      openUrl: noopOpen,
      maxPollAttempts: 3,
    });

    expect(result).toEqual({
      success: false,
      error: 'Authorization timed out. Please try again.',
    });
    expect(state.tokenCalls).toBe(3);
  });

  it('returns an error when the device authorization request fails', async () => {
    const state = makeState({
      deviceAnswer: oauthError('invalid_client', 401),
    });

    await expect(
      login({
        url: APP_URL,
        pollIntervalMs: 1,
        fetch: router(state),
        openUrl: noopOpen,
      }),
    ).resolves.toEqual({
      success: false,
      error: 'Failed to request device code',
    });
  });

  it('shows the user code and opens the complete verification URL', async () => {
    const opened: string[] = [];

    await login({
      url: APP_URL,
      pollIntervalMs: 1,
      fetch: router(makeState()),
      openUrl: async (url) => {
        opened.push(url);
      },
    });

    expect(opened).toEqual([`${APP_URL}/oauth/device?user_code=ABCD-EFGH`]);
    const text = stderrText();
    expect(text).toContain('ABCD-EFGH');
    expect(text).toContain(`${APP_URL}/oauth/device?user_code=ABCD-EFGH`);
  });

  it('falls back to the plain verification URL when no complete form is given', async () => {
    const state = makeState({
      deviceAnswer: () =>
        jsonResponse({
          device_code: 'dc_1',
          user_code: 'ABCD-EFGH',
          verification_uri: `${APP_URL}/oauth/device`,
          expires_in: 600,
          interval: 0,
        }),
    });
    const opened: string[] = [];

    await login({
      url: APP_URL,
      pollIntervalMs: 1,
      fetch: router(state),
      openUrl: async (url) => {
        opened.push(url);
      },
    });

    expect(opened).toEqual([`${APP_URL}/oauth/device`]);
  });

  it('still succeeds when the identity lookup fails, without an email', async () => {
    const state = makeState({
      whoamiAnswer: () => jsonResponse({ error: 'nope' }, 500),
    });

    const result = await login({
      url: APP_URL,
      pollIntervalMs: 1,
      fetch: router(state),
      openUrl: noopOpen,
    });

    expect(result.success).toBe(true);
    expect(result.email).toBeUndefined();
    expect(readConfig()?.accessToken).toBe('at_1');
  });

  it('keeps a browser that will not open from failing the login', async () => {
    const result = await login({
      url: APP_URL,
      pollIntervalMs: 1,
      fetch: router(makeState()),
      openUrl: async () => {
        throw new Error('no display');
      },
    });

    expect(result.success).toBe(true);
    expect(stderrText()).toContain('Could not open browser');
  });
  it('bounds the identity lookup, which runs after the session is stored', async () => {
    const route = router(makeState());
    let whoamiSignal: AbortSignal | null | undefined;
    const fetchFn: typeof fetch = async (input, init) => {
      if (String(input).endsWith('/api/auth/whoami'))
        whoamiSignal = init?.signal;
      return route(input, init);
    };

    const result = await login({
      url: APP_URL,
      pollIntervalMs: 1,
      fetch: fetchFn,
      openUrl: noopOpen,
    });

    expect(result.success).toBe(true);
    expect(whoamiSignal).toBeInstanceOf(AbortSignal);
  });

  it('refuses an app URL that would carry the session over plain http', async () => {
    const state = makeState();

    await expect(
      login({
        url: 'http://app.example.test',
        pollIntervalMs: 1,
        fetch: router(state),
        openUrl: noopOpen,
      }),
    ).rejects.toThrow(/plain http/);

    expect(state.tokenCalls).toBe(0);
    expect(readConfig()).toBeNull();
  });

  it('accepts a loopback app URL over plain http', async () => {
    const result = await login({
      url: 'http://127.0.0.1:3000',
      pollIntervalMs: 1,
      fetch: router(makeState()),
      openUrl: noopOpen,
    });

    expect(result.success).toBe(true);
    expect(readConfig()?.appUrl).toBe('http://127.0.0.1:3000');
  });
});
