import {
  CLI_CLIENT_ID,
  CLI_SCOPE,
  startDeviceAuthorization,
  pollDeviceToken,
  refreshTokens,
  revokeRefreshToken,
} from '../../../core/oauth-client.js';

const APP_URL = 'https://app.example.test';
const DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';

/** `withConfigLock` treats a lock held longer than this as abandoned. */
const LOCK_STALE_MS = 15_000;

interface RecordedCall {
  url: string;
  method: string | undefined;
  contentType: string | undefined;
  form: Record<string, string>;
  signal: AbortSignal | null | undefined;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function oauthError(error: string, status = 400): Response {
  return jsonResponse(
    { error, error_description: `${error} happened` },
    status,
  );
}

/**
 * A fetch double that records the request line of every call and answers with
 * the next queued response factory. Factories, not responses, because a
 * `Response` body can only be read once.
 */
function recorder(...responses: Array<() => Response>) {
  const calls: RecordedCall[] = [];
  let index = 0;

  const fetchFn: typeof fetch = async (input, init) => {
    const headers: Record<string, string> = {};
    const raw = init?.headers;
    if (raw instanceof Headers) Object.assign(headers, Object.fromEntries(raw));
    else if (Array.isArray(raw))
      Object.assign(headers, Object.fromEntries(raw));
    else if (raw) Object.assign(headers, raw);

    const body = typeof init?.body === 'string' ? init.body : '';
    calls.push({
      url: String(input),
      method: init?.method,
      contentType: headers['Content-Type'] ?? headers['content-type'],
      form: Object.fromEntries(new URLSearchParams(body)),
      signal: init?.signal,
    });

    const next = responses[index] ?? responses[responses.length - 1];
    index += 1;
    if (!next) throw new Error('recorder has no configured response');
    return next();
  };

  return { fetchFn, calls };
}

function tokenBody(overrides: Record<string, unknown> = {}) {
  return {
    access_token: 'at_new',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'rt_new',
    ...overrides,
  };
}

describe('oauth-client', () => {
  describe('startDeviceAuthorization', () => {
    it('posts a form-encoded client_id, scope and api resource', async () => {
      const { fetchFn, calls } = recorder(() =>
        jsonResponse({
          device_code: 'dc_1',
          user_code: 'ABCD-EFGH',
          verification_uri: `${APP_URL}/oauth/device`,
          verification_uri_complete: `${APP_URL}/oauth/device?user_code=ABCD-EFGH`,
          expires_in: 600,
          interval: 5,
        }),
      );

      await startDeviceAuthorization(APP_URL, fetchFn);

      expect(calls).toHaveLength(1);
      const call = calls[0];
      expect(call?.url).toBe(`${APP_URL}/api/oauth/device_authorization`);
      expect(call?.method).toBe('POST');
      expect(call?.contentType).toBe('application/x-www-form-urlencoded');
      expect(call?.form).toEqual({
        client_id: CLI_CLIENT_ID,
        scope: CLI_SCOPE,
        resource: `${APP_URL}/api`,
      });
    });

    it('maps the snake_case response onto the camelCase result', async () => {
      const { fetchFn } = recorder(() =>
        jsonResponse({
          device_code: 'dc_1',
          user_code: 'ABCD-EFGH',
          verification_uri: `${APP_URL}/oauth/device`,
          verification_uri_complete: `${APP_URL}/oauth/device?user_code=ABCD-EFGH`,
          expires_in: 600,
          interval: 5,
        }),
      );

      await expect(startDeviceAuthorization(APP_URL, fetchFn)).resolves.toEqual(
        {
          deviceCode: 'dc_1',
          userCode: 'ABCD-EFGH',
          verificationUri: `${APP_URL}/oauth/device`,
          verificationUriComplete: `${APP_URL}/oauth/device?user_code=ABCD-EFGH`,
          expiresIn: 600,
          interval: 5,
        },
      );
    });

    it('falls back to verification_uri when the server omits the complete form', async () => {
      const { fetchFn } = recorder(() =>
        jsonResponse({
          device_code: 'dc_1',
          user_code: 'ABCD-EFGH',
          verification_uri: `${APP_URL}/oauth/device`,
          expires_in: 600,
          interval: 5,
        }),
      );

      const result = await startDeviceAuthorization(APP_URL, fetchFn);
      expect(result.verificationUriComplete).toBe(`${APP_URL}/oauth/device`);
    });

    it('throws on an error status', async () => {
      const { fetchFn } = recorder(() => oauthError('invalid_client', 401));
      await expect(startDeviceAuthorization(APP_URL, fetchFn)).rejects.toThrow(
        /invalid_client/,
      );
    });

    it('throws when the response is missing device_code', async () => {
      const { fetchFn } = recorder(() =>
        jsonResponse({
          user_code: 'ABCD-EFGH',
          verification_uri: `${APP_URL}/oauth/device`,
          expires_in: 600,
          interval: 5,
        }),
      );

      await expect(startDeviceAuthorization(APP_URL, fetchFn)).rejects.toThrow(
        /device authorization response/i,
      );
    });
  });

  describe('pollDeviceToken', () => {
    it('posts the device grant with the device code and client id', async () => {
      const { fetchFn, calls } = recorder(() => jsonResponse(tokenBody()));

      await pollDeviceToken(APP_URL, 'dc_1', fetchFn);

      const call = calls[0];
      expect(call?.url).toBe(`${APP_URL}/api/oauth/token`);
      expect(call?.method).toBe('POST');
      expect(call?.contentType).toBe('application/x-www-form-urlencoded');
      expect(call?.form).toEqual({
        grant_type: DEVICE_GRANT,
        device_code: 'dc_1',
        client_id: CLI_CLIENT_ID,
      });
    });

    it('returns the token set with an absolute expiry on success', async () => {
      const { fetchFn } = recorder(() => jsonResponse(tokenBody()));
      const before = Date.now();

      const result = await pollDeviceToken(APP_URL, 'dc_1', fetchFn);

      expect(result.status).toBe('ok');
      if (result.status !== 'ok') throw new Error('expected ok');
      expect(result.tokens.accessToken).toBe('at_new');
      expect(result.tokens.refreshToken).toBe('rt_new');
      const expiresAt = Date.parse(result.tokens.accessTokenExpiresAt);
      expect(expiresAt).toBeGreaterThanOrEqual(before + 3600_000);
      expect(expiresAt).toBeLessThanOrEqual(Date.now() + 3600_000);
    });

    it.each([
      ['authorization_pending', 'pending'],
      ['slow_down', 'slow_down'],
      ['access_denied', 'denied'],
      ['expired_token', 'expired'],
    ])('maps the %s error onto status %s', async (code, status) => {
      const { fetchFn } = recorder(() => oauthError(code));
      const result = await pollDeviceToken(APP_URL, 'dc_1', fetchFn);
      expect(result.status).toBe(status);
    });

    it('reports an unrecognized error code as an error rather than pending', async () => {
      // The control for the mapping table: an unknown code must not silently
      // fall into one of the retryable buckets and poll forever.
      const { fetchFn } = recorder(() => oauthError('invalid_client', 401));
      const result = await pollDeviceToken(APP_URL, 'dc_1', fetchFn);

      expect(result.status).toBe('error');
      if (result.status !== 'error') throw new Error('expected error');
      // Both halves reach the caller: the code names the fault, the
      // description is the only part that tells the person what to do.
      expect(result.error).toBe('invalid_client: invalid_client happened');
    });

    it('reports a non-JSON error body as an error', async () => {
      const { fetchFn } = recorder(
        () => new Response('<html>gateway</html>', { status: 502 }),
      );
      const result = await pollDeviceToken(APP_URL, 'dc_1', fetchFn);
      expect(result.status).toBe('error');
    });
  });

  describe('refreshTokens', () => {
    it('posts the refresh grant with the refresh token and client id', async () => {
      const { fetchFn, calls } = recorder(() => jsonResponse(tokenBody()));

      await refreshTokens(APP_URL, 'rt_old', fetchFn);

      const call = calls[0];
      expect(call?.url).toBe(`${APP_URL}/api/oauth/token`);
      expect(call?.contentType).toBe('application/x-www-form-urlencoded');
      expect(call?.form).toEqual({
        grant_type: 'refresh_token',
        refresh_token: 'rt_old',
        client_id: CLI_CLIENT_ID,
      });
    });

    it('bounds the request with a timeout below the config lock stale window', async () => {
      // A refresh runs while holding the config lock, which is treated as
      // abandoned after 15 s. A request allowed to outlive that would have its
      // own lock broken out from under it.
      //
      // The deadline itself is asserted, not merely that some signal is
      // attached: a signal built from a 60 s timeout is an AbortSignal too, so
      // the shape alone would pass for a value that outlives the lock.
      const timeout = jest.spyOn(AbortSignal, 'timeout');
      const { fetchFn, calls } = recorder(() => jsonResponse(tokenBody()));

      await refreshTokens(APP_URL, 'rt_old', fetchFn);

      expect(timeout).toHaveBeenCalledTimes(1);
      const [ms] = timeout.mock.calls[0] ?? [];
      expect(ms).toBe(10_000);
      expect(ms).toBeLessThan(LOCK_STALE_MS);
      expect(calls[0]?.signal).toBeInstanceOf(AbortSignal);

      timeout.mockRestore();
    });

    it('returns the rotated token set', async () => {
      const { fetchFn } = recorder(() => jsonResponse(tokenBody()));
      const result = await refreshTokens(APP_URL, 'rt_old', fetchFn);

      expect(result).not.toBeNull();
      expect(result?.accessToken).toBe('at_new');
      expect(result?.refreshToken).toBe('rt_new');
    });

    it('reports a null refresh token when the server rotates none', async () => {
      const { fetchFn } = recorder(() =>
        jsonResponse(tokenBody({ refresh_token: undefined })),
      );
      const result = await refreshTokens(APP_URL, 'rt_old', fetchFn);
      expect(result?.refreshToken).toBeNull();
    });

    it('returns null on invalid_grant', async () => {
      const { fetchFn } = recorder(() => oauthError('invalid_grant'));
      await expect(
        refreshTokens(APP_URL, 'rt_old', fetchFn),
      ).resolves.toBeNull();
    });

    it('throws on an error that is not invalid_grant', async () => {
      // The control for the null result: null must mean "this refresh token is
      // dead, re-login", not "any refresh failure". A transient server fault
      // must stay distinguishable so it does not delete the stored session.
      const { fetchFn } = recorder(() => oauthError('server_error', 500));
      await expect(refreshTokens(APP_URL, 'rt_old', fetchFn)).rejects.toThrow(
        /server_error/,
      );
    });

    it('throws when the transport fails', async () => {
      const fetchFn: typeof fetch = async () => {
        throw new Error('network unreachable');
      };
      await expect(refreshTokens(APP_URL, 'rt_old', fetchFn)).rejects.toThrow(
        'network unreachable',
      );
    });
  });

  describe('revokeRefreshToken', () => {
    it('posts the token with a refresh_token hint and the client id', async () => {
      const { fetchFn, calls } = recorder(
        () => new Response(null, { status: 200 }),
      );

      await revokeRefreshToken(APP_URL, 'rt_old', fetchFn);

      const call = calls[0];
      expect(call?.url).toBe(`${APP_URL}/api/oauth/revoke`);
      expect(call?.method).toBe('POST');
      expect(call?.contentType).toBe('application/x-www-form-urlencoded');
      expect(call?.form).toEqual({
        token: 'rt_old',
        token_type_hint: 'refresh_token',
        client_id: CLI_CLIENT_ID,
      });
    });

    it('bounds the request so a stalled revoke cannot delay the local clear', async () => {
      // Logout clears the machine whether or not the server answers, so the
      // only thing a stalled revoke can cost is the wait before that clear.
      const timeout = jest.spyOn(AbortSignal, 'timeout');
      const { fetchFn, calls } = recorder(
        () => new Response(null, { status: 200 }),
      );

      await revokeRefreshToken(APP_URL, 'rt_old', fetchFn);

      // Pinned to the revoke call specifically: one request went out, to the
      // revoke endpoint, and one deadline was set for it.
      expect(calls).toHaveLength(1);
      expect(calls[0]?.url).toBe(`${APP_URL}/api/oauth/revoke`);
      expect(timeout).toHaveBeenCalledTimes(1);
      expect(timeout.mock.calls[0]?.[0]).toBe(5_000);
      expect(calls[0]?.signal).toBeInstanceOf(AbortSignal);

      timeout.mockRestore();
    });

    it('resolves despite an error status', async () => {
      const { fetchFn } = recorder(() => oauthError('invalid_client', 401));
      await expect(
        revokeRefreshToken(APP_URL, 'rt_old', fetchFn),
      ).resolves.toBeUndefined();
    });

    it('resolves despite a transport failure', async () => {
      const fetchFn: typeof fetch = async () => {
        throw new Error('network unreachable');
      };
      await expect(
        revokeRefreshToken(APP_URL, 'rt_old', fetchFn),
      ).resolves.toBeUndefined();
    });
  });
});
