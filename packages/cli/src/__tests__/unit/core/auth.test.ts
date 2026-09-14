import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  resolveAccessToken,
  getAuthHeaders,
  credentialSource,
  resolveRunToken,
  requireProjectId,
  resetLegacyTokenNotice,
} from '../../../core/auth.js';
import { readConfig, writeConfig } from '../../../lib/config-file.js';
import { withConfigLock } from '../../../lib/config-lock.js';

const APP_URL = 'https://app.example.test';
const NOW = Date.parse('2026-09-07T12:00:00.000Z');

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A fetch double that fails the test if it is called at all, while recording
 * the attempt so the assertion names what happened rather than the throw.
 */
function forbiddenFetch() {
  const calls: string[] = [];
  const fetchFn: typeof fetch = async (input) => {
    calls.push(String(input));
    throw new Error(`unexpected network call to ${String(input)}`);
  };
  return { fetchFn, calls };
}

function tokenResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('core/auth', () => {
  let dir: string;
  const originalEnv = process.env;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'walkeros-auth-'));
    process.env = { ...originalEnv };
    process.env.XDG_CONFIG_HOME = dir;
    delete process.env.WALKEROS_TOKEN;
    delete process.env.WALKEROS_DEPLOY_TOKEN;
    delete process.env.WALKEROS_PROJECT_ID;
    process.env.WALKEROS_APP_URL = APP_URL;
    resetLegacyTokenNotice();
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(dir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  describe('resolveAccessToken', () => {
    it('returns null when nothing is configured', async () => {
      await expect(resolveAccessToken()).resolves.toBeNull();
    });

    it('prefers WALKEROS_TOKEN over a stored session', async () => {
      writeConfig({
        accessToken: 'at_config',
        accessTokenExpiresAt: iso(NOW + 3600_000),
        refreshToken: 'rt_1',
      });
      process.env.WALKEROS_TOKEN = 'env-token';

      await expect(resolveAccessToken({ now: () => NOW })).resolves.toBe(
        'env-token',
      );
    });

    it('returns the stored session when WALKEROS_TOKEN is absent', async () => {
      // The control for the precedence test above: proves "env wins" is about
      // priority, not about the stored session being unreadable.
      writeConfig({
        accessToken: 'at_config',
        accessTokenExpiresAt: iso(NOW + 3600_000),
        refreshToken: 'rt_1',
      });

      await expect(resolveAccessToken({ now: () => NOW })).resolves.toBe(
        'at_config',
      );
    });

    it('honors a legacy static token', async () => {
      writeConfig({ token: 'legacy-token' });
      jest.spyOn(process.stderr, 'write').mockReturnValue(true);

      await expect(resolveAccessToken()).resolves.toBe('legacy-token');
    });

    it('logs the legacy deprecation notice exactly once per process', async () => {
      writeConfig({ token: 'legacy-token' });
      const write = jest.spyOn(process.stderr, 'write').mockReturnValue(true);

      await resolveAccessToken();
      await resolveAccessToken();

      const notices = write.mock.calls.filter((call) =>
        String(call[0]).includes('walkeros auth login'),
      );
      expect(notices).toHaveLength(1);
      expect(String(notices[0]?.[0])).toContain('walkeros auth login');
    });

    it('returns a fresh access token without any network call', async () => {
      writeConfig({
        accessToken: 'at_fresh',
        accessTokenExpiresAt: iso(NOW + 3600_000),
        refreshToken: 'rt_1',
      });
      const { fetchFn, calls } = forbiddenFetch();

      await expect(
        resolveAccessToken({ fetch: fetchFn, now: () => NOW }),
      ).resolves.toBe('at_fresh');
      expect(calls).toEqual([]);
    });

    it('refreshes an access token inside the sixty second window', async () => {
      // 30 s of life left is inside the 60 s skew window, so it counts as stale
      // even though it has not formally expired.
      writeConfig({
        accessToken: 'at_stale',
        accessTokenExpiresAt: iso(NOW + 30_000),
        refreshToken: 'rt_old',
      });
      let hits = 0;
      const fetchFn: typeof fetch = async () => {
        hits += 1;
        return tokenResponse({
          access_token: 'at_rotated',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'rt_rotated',
        });
      };

      await expect(
        resolveAccessToken({ fetch: fetchFn, now: () => NOW }),
      ).resolves.toBe('at_rotated');

      expect(hits).toBe(1);
      const stored = readConfig();
      expect(stored?.accessToken).toBe('at_rotated');
      expect(stored?.refreshToken).toBe('rt_rotated');
      expect(Date.parse(stored?.accessTokenExpiresAt ?? '')).toBeGreaterThan(
        NOW + 3000_000,
      );
    });

    it('keeps the existing refresh token when the server rotates none', async () => {
      writeConfig({
        accessToken: 'at_stale',
        accessTokenExpiresAt: iso(NOW - 1000),
        refreshToken: 'rt_keep',
      });
      const fetchFn: typeof fetch = async () =>
        tokenResponse({
          access_token: 'at_rotated',
          token_type: 'Bearer',
          expires_in: 3600,
        });

      await resolveAccessToken({ fetch: fetchFn, now: () => NOW });

      expect(readConfig()?.refreshToken).toBe('rt_keep');
    });

    it('reuses a session another process refreshed while we waited for the lock, without a network call', async () => {
      writeConfig({
        accessToken: 'at_stale',
        accessTokenExpiresAt: iso(NOW + 10_000),
        refreshToken: 'rt_old',
      });
      const { fetchFn, calls } = forbiddenFetch();

      let release!: () => void;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      let acquired!: () => void;
      const isHeld = new Promise<void>((resolve) => {
        acquired = resolve;
      });

      // Stand in for a second walkerOS process that holds the lock and
      // refreshes the session while this one waits behind it.
      const holder = withConfigLock(async () => {
        acquired();
        await held;
        writeConfig({
          accessToken: 'at_by_other_process',
          accessTokenExpiresAt: iso(NOW + 3600_000),
          refreshToken: 'rt_by_other_process',
        });
      });
      await isHeld;

      const pending = resolveAccessToken({ fetch: fetchFn, now: () => NOW });
      await wait(150);
      release();
      await holder;

      await expect(pending).resolves.toBe('at_by_other_process');
      expect(calls).toEqual([]);
    });

    it('clears the stored session and returns null when the refresh token is rejected', async () => {
      writeConfig({
        email: 'user@example.test',
        accessToken: 'at_stale',
        accessTokenExpiresAt: iso(NOW - 1000),
        refreshToken: 'rt_dead',
        defaultProjectId: 'proj_keep',
      });
      const fetchFn: typeof fetch = async () =>
        tokenResponse(
          { error: 'invalid_grant', error_description: 'dead' },
          400,
        );

      await expect(
        resolveAccessToken({ fetch: fetchFn, now: () => NOW }),
      ).resolves.toBeNull();

      const stored = readConfig();
      expect(stored?.accessToken).toBeUndefined();
      expect(stored?.refreshToken).toBeUndefined();
      expect(stored?.email).toBeUndefined();
      expect(stored?.defaultProjectId).toBe('proj_keep');
    });

    it('keeps the stored session when the refresh fails for a transient reason', async () => {
      // The control for the clearing test: a network blip must not log the
      // person out, only a server verdict on the refresh token itself may.
      writeConfig({
        accessToken: 'at_stale',
        accessTokenExpiresAt: iso(NOW - 1000),
        refreshToken: 'rt_alive',
      });
      const fetchFn: typeof fetch = async () => {
        throw new Error('network unreachable');
      };

      await expect(
        resolveAccessToken({ fetch: fetchFn, now: () => NOW }),
      ).rejects.toThrow('network unreachable');

      expect(readConfig()?.refreshToken).toBe('rt_alive');
    });

    it('names the connection, not the session, when the refresh cannot be sent', async () => {
      // Null is how this function says "no session", which makes callers tell
      // the person to log in and send the request unauthenticated. An
      // unreachable server must not be reported that way.
      writeConfig({
        accessToken: 'at_stale',
        accessTokenExpiresAt: iso(NOW - 1000),
        refreshToken: 'rt_alive',
      });
      const fetchFn: typeof fetch = async () => {
        throw new Error('network unreachable');
      };

      const failure = await resolveAccessToken({
        fetch: fetchFn,
        now: () => NOW,
      }).catch((error: unknown) =>
        error instanceof Error ? error.message : String(error),
      );

      expect(failure).toContain('Could not reach');
      expect(failure).toContain(APP_URL);
      expect(failure).toContain('session was kept');
      expect(failure).not.toContain('walkeros auth login');
    });

    it('returns null for an expired session with no refresh token', async () => {
      writeConfig({
        accessToken: 'at_stale',
        accessTokenExpiresAt: iso(NOW - 1000),
      });
      const { fetchFn, calls } = forbiddenFetch();

      await expect(
        resolveAccessToken({ fetch: fetchFn, now: () => NOW }),
      ).resolves.toBeNull();
      expect(calls).toEqual([]);
    });
  });

  describe('getAuthHeaders', () => {
    it('returns an empty object when nothing is configured', async () => {
      await expect(getAuthHeaders()).resolves.toEqual({});
    });

    it('returns a bearer header for the resolved token', async () => {
      process.env.WALKEROS_TOKEN = 'sk-walkeros-test';
      await expect(getAuthHeaders()).resolves.toEqual({
        Authorization: 'Bearer sk-walkeros-test',
      });
    });
  });

  describe('credentialSource', () => {
    it('returns null when nothing is configured', () => {
      expect(credentialSource()).toBeNull();
    });

    it('returns env for WALKEROS_TOKEN', () => {
      process.env.WALKEROS_TOKEN = 'env-token';
      expect(credentialSource()).toBe('env');
    });

    it('returns config for a stored session', () => {
      writeConfig({ accessToken: 'at', accessTokenExpiresAt: iso(NOW) });
      expect(credentialSource()).toBe('config');
    });

    it('returns config for a legacy static token', () => {
      writeConfig({ token: 'legacy' });
      expect(credentialSource()).toBe('config');
    });

    it('returns null for a config that holds no credential at all', () => {
      writeConfig({ defaultProjectId: 'proj_1' });
      expect(credentialSource()).toBeNull();
    });
  });

  describe('resolveRunToken', () => {
    it('returns WALKEROS_DEPLOY_TOKEN when set', () => {
      process.env.WALKEROS_DEPLOY_TOKEN = 'deploy-token';
      process.env.WALKEROS_TOKEN = 'regular-token';
      expect(resolveRunToken()).toBe('deploy-token');
    });

    it('falls back to WALKEROS_TOKEN when no deploy token', () => {
      process.env.WALKEROS_TOKEN = 'regular-token';
      expect(resolveRunToken()).toBe('regular-token');
    });

    it('returns null when no token available', () => {
      expect(resolveRunToken()).toBeNull();
    });

    it('ignores a refreshable session, which a runner cannot refresh', () => {
      writeConfig({
        accessToken: 'at',
        accessTokenExpiresAt: iso(NOW + 3600_000),
        refreshToken: 'rt',
      });
      expect(resolveRunToken()).toBeNull();
    });
  });

  describe('requireProjectId', () => {
    it('returns env var when set', () => {
      process.env.WALKEROS_PROJECT_ID = 'proj-from-env';
      expect(requireProjectId()).toBe('proj-from-env');
    });

    it('returns config defaultProjectId when env var not set', () => {
      writeConfig({ defaultProjectId: 'proj-from-config' });
      expect(requireProjectId()).toBe('proj-from-config');
    });

    it('prefers env var over config when both set', () => {
      process.env.WALKEROS_PROJECT_ID = 'proj-from-env';
      writeConfig({ defaultProjectId: 'proj-from-config' });
      expect(requireProjectId()).toBe('proj-from-env');
    });

    it('throws when neither env var nor config is set', () => {
      expect(() => requireProjectId()).toThrow(
        'No project selected. Set WALKEROS_PROJECT_ID or configure a default project.',
      );
    });
  });
});
