import { mkdtempSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { completeDeviceLogin } from '../../../commands/login/index.js';
import { readConfig, getConfigPath } from '../../../lib/config-file.js';

const APP_URL = 'https://app.example.test';
const DEVICE_CODE = 'dc_resume';

/** Long enough for many 1 ms polls, short enough to keep the suite fast. */
const WINDOW_MS = 200;

interface RouteState {
  /** Queued answers for the token endpoint, consumed in order. */
  tokenAnswers: Array<() => Response>;
  whoamiAnswer: () => Response;
  tokenCalls: number;
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
    if (url.endsWith('/api/oauth/token')) {
      const answer =
        state.tokenAnswers[state.tokenCalls] ??
        state.tokenAnswers[state.tokenAnswers.length - 1];
      state.tokenCalls += 1;
      if (!answer) throw new Error('no token answer configured');
      return answer();
    }
    if (url.endsWith('/api/auth/whoami')) return state.whoamiAnswer();
    throw new Error(`unexpected request to ${url}`);
  };
}

function makeState(overrides: Partial<RouteState> = {}): RouteState {
  return {
    tokenAnswers: [tokenOk()],
    whoamiAnswer: whoamiOk(),
    tokenCalls: 0,
    ...overrides,
  };
}

function run(state: RouteState) {
  return completeDeviceLogin(DEVICE_CODE, {
    url: APP_URL,
    fetch: router(state),
    intervalMs: 1,
    timeoutMs: WINDOW_MS,
  });
}

describe('completeDeviceLogin', () => {
  let dir: string;
  const originalEnv = process.env;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'walkeros-resume-'));
    process.env = { ...originalEnv };
    process.env.XDG_CONFIG_HOME = dir;
    delete process.env.WALKEROS_TOKEN;
    process.env.WALKEROS_APP_URL = APP_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(dir, { recursive: true, force: true });
  });

  it('stores the session and reports ok, carrying no token material back', async () => {
    const state = makeState();

    const result = await run(state);

    // Exact equality, not a status check: the caller must never receive token
    // material, because the credential file has exactly one writer.
    expect(result).toEqual({ status: 'ok' });
    const stored = readConfig();
    expect(stored?.accessToken).toBe('at_1');
    expect(stored?.refreshToken).toBe('rt_1');
    expect(stored?.email).toBe('user@example.test');
  });

  it('reports pending and writes nothing when the window closes on an outstanding approval', async () => {
    const state = makeState({
      tokenAnswers: [oauthError('authorization_pending')],
    });

    const result = await run(state);

    expect(result).toEqual({ status: 'pending' });
    expect(existsSync(getConfigPath())).toBe(false);
    // The window was spent polling, not waiting out one long interval.
    expect(state.tokenCalls).toBeGreaterThan(1);
  });

  it('reports slow_down and widens the interval when the server asks for a wider gap', async () => {
    // The control for the pending case: same window, same starting interval,
    // only the server's answer differs, so both the status and the single poll
    // are attributable to `slow_down` rather than to the timing.
    const state = makeState({ tokenAnswers: [oauthError('slow_down')] });

    const result = await run(state);

    expect(result).toEqual({ status: 'slow_down' });
    expect(state.tokenCalls).toBe(1);
    expect(existsSync(getConfigPath())).toBe(false);
  });

  it.each([
    ['access_denied', 'denied'],
    ['expired_token', 'expired'],
  ])('returns %s as status %s and stops polling', async (code, status) => {
    const state = makeState({ tokenAnswers: [oauthError(code)] });

    const result = await run(state);

    expect(result).toEqual({ status });
    expect(state.tokenCalls).toBe(1);
    expect(existsSync(getConfigPath())).toBe(false);
  });

  it('returns the server error on an unrecognized failure', async () => {
    const state = makeState({
      tokenAnswers: [oauthError('invalid_client', 401)],
    });

    const result = await run(state);

    expect(result.status).toBe('error');
    expect(result).toHaveProperty(
      'error',
      expect.stringContaining('invalid_client'),
    );
    expect(state.tokenCalls).toBe(1);
    expect(existsSync(getConfigPath())).toBe(false);
  });

  it('runs at the interval its caller states, without a floor of its own', async () => {
    // The clamp on a server-stated interval belongs at the command's call
    // site, not here. Moving it into this helper would make the whole window
    // below smaller than one interval and produce zero polls, which is what
    // this pins: a caller that states its own pace keeps it.
    const state = makeState({
      tokenAnswers: [oauthError('authorization_pending')],
    });

    const result = await run(state);

    expect(result).toEqual({ status: 'pending' });
    expect(state.tokenCalls).toBeGreaterThan(10);
  });

  it('aborts a stalled poll at the deadline instead of waiting out the socket', async () => {
    // The double never settles on its own: it settles only when the request's
    // OWN signal fires. So the loop running out of attempts cannot rescue this
    // case, and without a per-request bound the call would hang until jest's
    // timeout rather than return. That is what makes the result attributable
    // to the signal.
    const seen: Array<AbortSignal | null | undefined> = [];
    const stalling: typeof fetch = (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        seen.push(init?.signal);
        init?.signal?.addEventListener('abort', () =>
          reject(init.signal?.reason),
        );
      });

    const started = Date.now();
    const result = await completeDeviceLogin(DEVICE_CODE, {
      url: APP_URL,
      fetch: stalling,
      intervalMs: 1,
      timeoutMs: 100,
    });

    expect(result).toEqual({ status: 'pending' });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBeInstanceOf(AbortSignal);
    expect(Date.now() - started).toBeLessThan(5000);
    expect(existsSync(getConfigPath())).toBe(false);
  });

  it('lets a real transport failure through rather than reporting it as pending', async () => {
    // The control for the abort case: both end the poll without a response, so
    // the abort branch must key on the signal and not on "the request threw".
    const failing: typeof fetch = async () => {
      throw new Error('network unreachable');
    };

    await expect(
      completeDeviceLogin(DEVICE_CODE, {
        url: APP_URL,
        fetch: failing,
        intervalMs: 1,
        timeoutMs: 100,
      }),
    ).rejects.toThrow('network unreachable');
  });

  it('keeps the session when the identity lookup fails, without an email', async () => {
    const state = makeState({
      whoamiAnswer: () => jsonResponse({ error: 'nope' }, 500),
    });

    const result = await run(state);

    expect(result).toEqual({ status: 'ok' });
    expect(readConfig()?.accessToken).toBe('at_1');
    expect(readConfig()?.email).toBeUndefined();
  });
});
