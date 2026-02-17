import { jest } from '@jest/globals';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { LoginOptions } from '../index.js';

// No-op browser opener for tests
const noopOpen = async () => {};

/** Create a fake Response-like object */
function fakeResponse(body: unknown, init?: { status?: number }) {
  const status = init?.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function createMockFetch(
  handler: (url: string) => Response,
): typeof globalThis.fetch {
  return (async (url: string | URL | Request) => {
    const urlStr = typeof url === 'string' ? url : url.toString();
    return handler(urlStr);
  }) as typeof globalThis.fetch;
}

describe('login (device code flow)', () => {
  let login: (options?: LoginOptions) => Promise<{
    success: boolean;
    email?: string;
    configPath?: string;
    error?: string;
  }>;
  let tmpDir: string;
  let origXdg: string | undefined;

  beforeEach(async () => {
    // Override the global fake timers from node.setup.mjs
    jest.useRealTimers();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Isolate config writes to a temp directory
    tmpDir = mkdtempSync(join(tmpdir(), 'walkeros-login-test-'));
    origXdg = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = tmpDir;

    const loginModule = await import('../index.js');
    login = loginModule.login;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Restore env and clean up temp dir
    if (origXdg !== undefined) {
      process.env.XDG_CONFIG_HOME = origXdg;
    } else {
      delete process.env.XDG_CONFIG_HOME;
    }
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('polls until approved and returns token', async () => {
    let pollCount = 0;

    const mockFetch = createMockFetch((url) => {
      if (url.includes('/api/auth/device/code')) {
        return fakeResponse({
          deviceCode: 'a'.repeat(64),
          userCode: 'BCDF-GHJK',
          verificationUri: 'https://app.test/auth/device',
          verificationUriComplete:
            'https://app.test/auth/device?user_code=BCDF-GHJK',
          expiresIn: 900,
          interval: 0,
        });
      }

      if (url.includes('/api/auth/device/token')) {
        pollCount++;
        if (pollCount === 1) {
          return fakeResponse(
            { error: 'authorization_pending' },
            { status: 400 },
          );
        }
        return fakeResponse({
          token: 'sk-walkeros-' + 'b'.repeat(64),
          email: 'test@example.com',
          userId: 'user_123',
        });
      }

      return fakeResponse({ error: 'not found' }, { status: 404 });
    });

    const result = await login({
      openUrl: noopOpen,
      fetch: mockFetch,
      maxPollAttempts: 10,
    });

    expect(result.success).toBe(true);
    expect(result.email).toBe('test@example.com');
    expect(pollCount).toBe(2);
  });

  it('returns expired error when code expires', async () => {
    const mockFetch = createMockFetch((url) => {
      if (url.includes('/api/auth/device/code')) {
        return fakeResponse({
          deviceCode: 'a'.repeat(64),
          userCode: 'BCDF-GHJK',
          verificationUri: 'https://app.test/auth/device',
          verificationUriComplete:
            'https://app.test/auth/device?user_code=BCDF-GHJK',
          expiresIn: 0,
          interval: 0,
        });
      }

      if (url.includes('/api/auth/device/token')) {
        return fakeResponse({ error: 'expired_token' }, { status: 400 });
      }

      return fakeResponse({ error: 'not found' }, { status: 404 });
    });

    const result = await login({
      openUrl: noopOpen,
      fetch: mockFetch,
      maxPollAttempts: 10,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('expired');
  });

  it('handles slow_down by continuing to poll', async () => {
    let pollCount = 0;

    const mockFetch = createMockFetch((url) => {
      if (url.includes('/api/auth/device/code')) {
        return fakeResponse({
          deviceCode: 'a'.repeat(64),
          userCode: 'BCDF-GHJK',
          verificationUri: 'https://app.test/auth/device',
          verificationUriComplete:
            'https://app.test/auth/device?user_code=BCDF-GHJK',
          expiresIn: 900,
          interval: 0,
        });
      }

      if (url.includes('/api/auth/device/token')) {
        pollCount++;
        if (pollCount === 1) {
          return fakeResponse({ error: 'slow_down' }, { status: 400 });
        }
        return fakeResponse({
          token: 'sk-walkeros-' + 'c'.repeat(64),
          email: 'slow@example.com',
          userId: 'user_456',
        });
      }

      return fakeResponse({ error: 'not found' }, { status: 404 });
    });

    const result = await login({
      openUrl: noopOpen,
      fetch: mockFetch,
      maxPollAttempts: 10,
    });
    expect(result.success).toBe(true);
    expect(pollCount).toBe(2);
  });

  it('times out when max poll attempts exceeded', async () => {
    const mockFetch = createMockFetch((url) => {
      if (url.includes('/api/auth/device/code')) {
        return fakeResponse({
          deviceCode: 'a'.repeat(64),
          userCode: 'BCDF-GHJK',
          verificationUri: 'https://app.test/auth/device',
          verificationUriComplete:
            'https://app.test/auth/device?user_code=BCDF-GHJK',
          expiresIn: 900,
          interval: 0,
        });
      }

      return fakeResponse({ error: 'authorization_pending' }, { status: 400 });
    });

    const result = await login({
      openUrl: noopOpen,
      fetch: mockFetch,
      maxPollAttempts: 3,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out');
  });

  it('returns error when device code request fails', async () => {
    const mockFetch = createMockFetch(() => {
      return fakeResponse({ error: 'server error' }, { status: 500 });
    });

    const result = await login({
      openUrl: noopOpen,
      fetch: mockFetch,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to request device code');
  });

  it('opens verificationUriComplete in browser when available', async () => {
    let openedUrl = '';
    const captureOpen = async (url: string) => {
      openedUrl = url;
    };

    const mockFetch = createMockFetch((url) => {
      if (url.includes('/api/auth/device/code')) {
        return fakeResponse({
          deviceCode: 'a'.repeat(64),
          userCode: 'BCDF-GHJK',
          verificationUri: 'https://app.test/auth/device',
          verificationUriComplete:
            'https://app.test/auth/device?user_code=BCDF-GHJK',
          expiresIn: 900,
          interval: 0,
        });
      }

      return fakeResponse({
        token: 'sk-walkeros-' + 'd'.repeat(64),
        email: 'url@example.com',
        userId: 'user_789',
      });
    });

    await login({
      openUrl: captureOpen,
      fetch: mockFetch,
      maxPollAttempts: 10,
    });

    expect(openedUrl).toBe('https://app.test/auth/device?user_code=BCDF-GHJK');
  });

  it('falls back to verificationUri when verificationUriComplete is missing', async () => {
    let openedUrl = '';
    const captureOpen = async (url: string) => {
      openedUrl = url;
    };

    const mockFetch = createMockFetch((url) => {
      if (url.includes('/api/auth/device/code')) {
        return fakeResponse({
          deviceCode: 'a'.repeat(64),
          userCode: 'BCDF-GHJK',
          verificationUri: 'https://app.test/auth/device',
          expiresIn: 900,
          interval: 0,
        });
      }

      return fakeResponse({
        token: 'sk-walkeros-' + 'e'.repeat(64),
        email: 'fallback@example.com',
        userId: 'user_101',
      });
    });

    await login({
      openUrl: captureOpen,
      fetch: mockFetch,
      maxPollAttempts: 10,
    });

    expect(openedUrl).toBe('https://app.test/auth/device');
  });
});
