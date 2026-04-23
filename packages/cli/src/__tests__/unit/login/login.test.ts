import { jest } from '@jest/globals';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type {
  LoginOptions,
  DeviceCodeOptions,
  PollOptions,
} from '../../../commands/login/index.js';

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
  let requestDeviceCode: (options?: DeviceCodeOptions) => Promise<{
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    verificationUriComplete?: string;
    expiresIn: number;
    interval: number;
  }>;
  let pollForToken: (
    deviceCode: string,
    options?: PollOptions,
  ) => Promise<
    | {
        success: true;
        status: 'authenticated';
        email: string;
        configPath: string;
      }
    | { success: false; status: 'pending' }
    | { success: false; status: 'error'; error: string }
  >;
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

    const loginModule = await import('../../../commands/login/index.js');
    login = loginModule.login;
    requestDeviceCode = loginModule.requestDeviceCode;
    pollForToken = loginModule.pollForToken;
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
  }, 10_000);

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

  it('displays verificationUriComplete to the user', async () => {
    const stderrWrites: string[] = [];
    const origWrite = process.stderr.write;
    process.stderr.write = ((chunk: string) => {
      stderrWrites.push(chunk);
      return true;
    }) as typeof process.stderr.write;

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
        token: 'sk-walkeros-' + 'f'.repeat(64),
        email: 'test@example.com',
        userId: 'user_123',
      });
    });

    try {
      await login({
        openUrl: noopOpen,
        fetch: mockFetch,
        maxPollAttempts: 10,
      });
    } finally {
      process.stderr.write = origWrite;
    }

    const output = stderrWrites.join('');
    expect(output).toContain(
      'https://app.test/auth/device?user_code=BCDF-GHJK',
    );
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

  // === requestDeviceCode tests ===

  it('requestDeviceCode returns code data on success', async () => {
    const mockFetch = createMockFetch((url) => {
      if (url.includes('/api/auth/device/code')) {
        return fakeResponse({
          deviceCode: 'dc_' + 'a'.repeat(64),
          userCode: 'ABCD-EFGH',
          verificationUri: 'https://app.test/auth/device',
          verificationUriComplete:
            'https://app.test/auth/device?user_code=ABCD-EFGH',
          expiresIn: 900,
          interval: 5,
        });
      }
      return fakeResponse({ error: 'not found' }, { status: 404 });
    });

    const result = await requestDeviceCode({
      url: 'https://app.test',
      fetch: mockFetch,
    });

    expect(result.deviceCode).toBe('dc_' + 'a'.repeat(64));
    expect(result.userCode).toBe('ABCD-EFGH');
    expect(result.verificationUri).toBe('https://app.test/auth/device');
    expect(result.verificationUriComplete).toBe(
      'https://app.test/auth/device?user_code=ABCD-EFGH',
    );
    expect(result.expiresIn).toBe(900);
    expect(result.interval).toBe(5);
  });

  it('requestDeviceCode throws on fetch failure', async () => {
    const mockFetch = createMockFetch(() => {
      return fakeResponse({ error: 'server error' }, { status: 500 });
    });

    await expect(
      requestDeviceCode({ url: 'https://app.test', fetch: mockFetch }),
    ).rejects.toThrow('Failed to request device code');
  });

  // === pollForToken tests ===

  it('pollForToken returns success when token received', async () => {
    const mockFetch = createMockFetch((url) => {
      if (url.includes('/api/auth/device/token')) {
        return fakeResponse({
          token: 'sk-walkeros-' + 'x'.repeat(64),
          email: 'poll@example.com',
          userId: 'user_poll',
        });
      }
      return fakeResponse({ error: 'not found' }, { status: 404 });
    });

    const result = await pollForToken('dc_test_code', {
      url: 'https://app.test',
      fetch: mockFetch,
      timeoutMs: 10000,
      intervalMs: 10,
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('authenticated');
    if (result.success) {
      expect(result.email).toBe('poll@example.com');
      expect(result.configPath).toBeDefined();
    }
  });

  it('pollForToken returns pending on timeout', async () => {
    const mockFetch = createMockFetch((url) => {
      if (url.includes('/api/auth/device/token')) {
        return fakeResponse(
          { error: 'authorization_pending' },
          { status: 400 },
        );
      }
      return fakeResponse({ error: 'not found' }, { status: 404 });
    });

    const result = await pollForToken('dc_test_code', {
      url: 'https://app.test',
      fetch: mockFetch,
      timeoutMs: 100,
      intervalMs: 30,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('pending');
  });

  it('pollForToken handles slow_down by increasing interval', async () => {
    let pollCount = 0;

    const mockFetch = createMockFetch((url) => {
      if (url.includes('/api/auth/device/token')) {
        pollCount++;
        if (pollCount === 1) {
          return fakeResponse({ error: 'slow_down' }, { status: 400 });
        }
        return fakeResponse({
          token: 'sk-walkeros-' + 'y'.repeat(64),
          email: 'slow@example.com',
          userId: 'user_slow',
        });
      }
      return fakeResponse({ error: 'not found' }, { status: 404 });
    });

    const result = await pollForToken('dc_test_code', {
      url: 'https://app.test',
      fetch: mockFetch,
      timeoutMs: 30000,
      intervalMs: 10,
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('authenticated');
    expect(pollCount).toBe(2);
  }, 10_000);

  it('pollForToken returns error on denied', async () => {
    const mockFetch = createMockFetch((url) => {
      if (url.includes('/api/auth/device/token')) {
        return fakeResponse({ error: 'access_denied' }, { status: 400 });
      }
      return fakeResponse({ error: 'not found' }, { status: 404 });
    });

    const result = await pollForToken('dc_test_code', {
      url: 'https://app.test',
      fetch: mockFetch,
      timeoutMs: 10000,
      intervalMs: 10,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('error');
    if (!result.success && result.status === 'error') {
      expect(result.error).toBe('access_denied');
    }
  });

  it('pollForToken returns error on expired token', async () => {
    const mockFetch = createMockFetch((url) => {
      if (url.includes('/api/auth/device/token')) {
        return fakeResponse({ error: 'expired_token' }, { status: 400 });
      }
      return fakeResponse({ error: 'not found' }, { status: 404 });
    });

    const result = await pollForToken('dc_test_code', {
      url: 'https://app.test',
      fetch: mockFetch,
      timeoutMs: 10000,
      intervalMs: 10,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('error');
    if (!result.success && result.status === 'error') {
      expect(result.error).toBe('expired_token');
    }
  });

  // === Bounded-fetch + malformed-JSON safety ===

  it('pollForToken passes an AbortSignal to fetch', async () => {
    const receivedInits: RequestInit[] = [];
    const mockFetch: typeof globalThis.fetch = (async (
      url: string | URL | Request,
      init?: RequestInit,
    ) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/api/auth/device/token')) {
        receivedInits.push(init ?? {});
        return fakeResponse({
          token: 'sk-walkeros-' + 'a'.repeat(64),
          email: 'signal@example.com',
          userId: 'user_signal',
        });
      }
      return fakeResponse({ error: 'not found' }, { status: 404 });
    }) as typeof globalThis.fetch;

    const result = await pollForToken('dc_test_code', {
      url: 'https://app.test',
      fetch: mockFetch,
      timeoutMs: 10000,
      intervalMs: 10,
    });

    expect(result.success).toBe(true);
    expect(receivedInits.length).toBeGreaterThan(0);
    const lastInit = receivedInits[receivedInits.length - 1];
    expect(lastInit.signal).toBeDefined();
    expect(typeof (lastInit.signal as AbortSignal).aborted).toBe('boolean');
  });

  it('pollForToken aborts in-flight fetch when deadline passes', async () => {
    // The fetch hangs forever unless aborted. If the bounded timeout works,
    // the pollForToken call resolves with pending (timeout) rather than hanging.
    let aborted = false;
    const mockFetch: typeof globalThis.fetch = (async (
      url: string | URL | Request,
      init?: RequestInit,
    ) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/api/auth/device/token')) {
        const signal = init?.signal;
        return await new Promise<Response>((_resolve, reject) => {
          if (signal) {
            signal.addEventListener('abort', () => {
              aborted = true;
              const abortError = new Error('The operation was aborted');
              abortError.name = 'AbortError';
              reject(abortError);
            });
          }
        });
      }
      return fakeResponse({ error: 'not found' }, { status: 404 });
    }) as typeof globalThis.fetch;

    const result = await pollForToken('dc_test_code', {
      url: 'https://app.test',
      fetch: mockFetch,
      timeoutMs: 150,
      intervalMs: 10,
    });

    expect(aborted).toBe(true);
    expect(result.success).toBe(false);
    // AbortError at the deadline is a timeout, not a real error
    expect(['pending', 'error']).toContain(result.status);
  }, 5000);

  it('pollForToken returns error shape on non-JSON token response', async () => {
    const htmlResponse = {
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON at position 0');
      },
      text: async () => '<html>server error</html>',
    } as unknown as Response;

    const mockFetch = createMockFetch((url) => {
      if (url.includes('/api/auth/device/token')) {
        return htmlResponse;
      }
      return fakeResponse({ error: 'not found' }, { status: 404 });
    });

    const result = await pollForToken('dc_test_code', {
      url: 'https://app.test',
      fetch: mockFetch,
      timeoutMs: 10000,
      intervalMs: 10,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('error');
    if (!result.success && result.status === 'error') {
      expect(result.error).toMatch(/malformed/i);
    }
  });

  it('pollForToken returns error shape when ok response is missing token field', async () => {
    const mockFetch = createMockFetch((url) => {
      if (url.includes('/api/auth/device/token')) {
        // ok: true but no token/email at all
        return fakeResponse({ something: 'else' });
      }
      return fakeResponse({ error: 'not found' }, { status: 404 });
    });

    const result = await pollForToken('dc_test_code', {
      url: 'https://app.test',
      fetch: mockFetch,
      timeoutMs: 200,
      intervalMs: 10,
    });

    expect(result.success).toBe(false);
    // Without a token/email and without an error field, this is just pending until timeout
    // but should NOT have thrown or written config.
    expect(['pending', 'error']).toContain(result.status);
  });

  it('pollForToken returns error shape when token field is wrong type', async () => {
    const mockFetch = createMockFetch((url) => {
      if (url.includes('/api/auth/device/token')) {
        return fakeResponse({
          token: 12345, // not a string
          email: 'x@example.com',
        });
      }
      return fakeResponse({ error: 'not found' }, { status: 404 });
    });

    const result = await pollForToken('dc_test_code', {
      url: 'https://app.test',
      fetch: mockFetch,
      timeoutMs: 10000,
      intervalMs: 10,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('error');
    if (!result.success && result.status === 'error') {
      expect(result.error).toMatch(/malformed/i);
    }
  });

  // === Zod schema validation (TokenResponseSchema + DeviceCodeResponseSchema) ===

  it('requestDeviceCode throws when deviceCode field is missing (Zod)', async () => {
    const mockFetch = createMockFetch((url) => {
      if (url.includes('/api/auth/device/code')) {
        return fakeResponse({
          userCode: 'X',
          verificationUri: 'https://app.test/device',
          expiresIn: 900,
          interval: 5,
        });
      }
      return fakeResponse({ error: 'not found' }, { status: 404 });
    });

    await expect(
      requestDeviceCode({ url: 'https://app.test', fetch: mockFetch }),
    ).rejects.toThrow(/malformed|invalid/i);
  });

  it('requestDeviceCode throws when expiresIn is a string instead of number (Zod)', async () => {
    const mockFetch = createMockFetch((url) => {
      if (url.includes('/api/auth/device/code')) {
        return fakeResponse({
          deviceCode: 'dc_abc',
          userCode: 'BCDF-GHJK',
          verificationUri: 'https://app.test/device',
          expiresIn: '900', // wrong type
          interval: 5,
        });
      }
      return fakeResponse({ error: 'not found' }, { status: 404 });
    });

    await expect(
      requestDeviceCode({ url: 'https://app.test', fetch: mockFetch }),
    ).rejects.toThrow(/malformed|invalid/i);
  });

  it('pollForToken rejects numeric token via Zod (schema negative case)', async () => {
    const mockFetch = createMockFetch((url) => {
      if (url.includes('/api/auth/device/token')) {
        return fakeResponse({
          token: 4242, // number not string
          email: 'n@example.com',
        });
      }
      return fakeResponse({ error: 'not found' }, { status: 404 });
    });

    const result = await pollForToken('dc_test_code', {
      url: 'https://app.test',
      fetch: mockFetch,
      timeoutMs: 10000,
      intervalMs: 10,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('error');
    if (!result.success && result.status === 'error') {
      expect(result.error).toMatch(/malformed/i);
    }
  });

  it('pollForToken rejects response missing email via Zod', async () => {
    const mockFetch = createMockFetch((url) => {
      if (url.includes('/api/auth/device/token')) {
        return fakeResponse({
          token: 'sk-walkeros-' + 'z'.repeat(64),
          // email missing
        });
      }
      return fakeResponse({ error: 'not found' }, { status: 404 });
    });

    const result = await pollForToken('dc_test_code', {
      url: 'https://app.test',
      fetch: mockFetch,
      timeoutMs: 10000,
      intervalMs: 10,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('error');
    if (!result.success && result.status === 'error') {
      expect(result.error).toMatch(/malformed|email/i);
    }
  });
});
