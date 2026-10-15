import { appFetch, appErrorMessage } from '../app-fetch.js';
import { resetClientContext, setClientContext } from '../client-context.js';

interface Seen {
  url: string;
  method: string;
  headers: Headers;
}

function recorder() {
  const seen: Seen[] = [];
  const fetchFn: typeof fetch = async (input, init) => {
    seen.push({
      url: String(input),
      method: init?.method ?? 'GET',
      headers: new Headers(init?.headers),
    });
    return new Response('{}', { status: 200 });
  };
  return { seen, fetchFn };
}

describe('appFetch', () => {
  beforeEach(() => setClientContext({ type: 'cli', version: '9.9.9' }));
  afterEach(() => resetClientContext());

  it('sends the client context on every request', async () => {
    const { seen, fetchFn } = recorder();
    await appFetch('/api/health', {
      baseUrl: 'https://app.test/',
      fetch: fetchFn,
    });
    expect(seen[0].url).toBe('https://app.test/api/health');
    expect(seen[0].headers.get('X-WalkerOS-Client')).toBe('cli');
    expect(seen[0].headers.get('X-WalkerOS-Client-Version')).toBe('9.9.9');
  });

  it('lets a caller header win and sends the bearer', async () => {
    const { seen, fetchFn } = recorder();
    await appFetch('/api/x', {
      baseUrl: 'https://app.test',
      token: 'tok',
      headers: { 'x-walkeros-client': 'custom', 'Idempotency-Key': 'k1' },
      method: 'POST',
      fetch: fetchFn,
    });
    expect(seen[0].method).toBe('POST');
    expect(seen[0].headers.get('X-WalkerOS-Client')).toBe('custom');
    expect(seen[0].headers.get('Idempotency-Key')).toBe('k1');
    expect(seen[0].headers.get('Authorization')).toBe('Bearer tok');
  });

  it('refuses to send a credential over plain http to a remote host', async () => {
    const { seen, fetchFn } = recorder();
    await expect(
      appFetch('/api/x', {
        baseUrl: 'http://app.test',
        token: 'tok',
        fetch: fetchFn,
      }),
    ).rejects.toThrow(/plain http/);
    expect(seen).toHaveLength(0);
  });

  it.each([
    [
      { error: { code: 'CLIENT_OUTDATED', message: 'needs >= 4.10.0' } },
      'needs >= 4.10.0',
    ],
    [{ error: 'invalid_grant' }, undefined],
    ['<html>', undefined],
  ])('reads the app error envelope of %j', (body, message) => {
    expect(appErrorMessage(body)).toBe(message);
  });
});
