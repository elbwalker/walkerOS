import { fetchContentString, loadJsonConfig } from '../../../config/utils.js';

const APP_URL = 'https://app.example.test';
const TOKEN = 'tok_secret';

interface RecordedCall {
  url: string;
  authorization: string | undefined;
}

/** A fetch double that records the request line of every call. */
function recorder() {
  const calls: RecordedCall[] = [];

  const fetchFn: typeof fetch = async (input, init) => {
    const headers: Record<string, string> = {};
    const raw = init?.headers;
    if (raw instanceof Headers) Object.assign(headers, Object.fromEntries(raw));
    else if (Array.isArray(raw))
      Object.assign(headers, Object.fromEntries(raw));
    else if (raw) Object.assign(headers, raw);

    calls.push({ url: String(input), authorization: headers.Authorization });

    return new Response('{}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  return { fetchFn, calls };
}

describe('fetchContentString sends no credential', () => {
  const originalEnv = process.env;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.WALKEROS_APP_URL = APP_URL;
    // Set in every case below, so the absence of a header is attributable to
    // the URL and never to there being no credential to send.
    process.env.WALKEROS_TOKEN = TOKEN;
  });

  afterEach(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
  });

  it('sends no Authorization header to the app origin either', async () => {
    const { fetchFn, calls } = recorder();
    globalThis.fetch = fetchFn;

    await fetchContentString(`${APP_URL}/api/flow-config/signed-abc`);

    expect(calls[0]?.authorization).toBeUndefined();
  });

  it.each([
    ['a foreign host', 'https://attacker.example/flow.json'],
    // Prefix-shaped: it starts with the app URL but is a different origin, so
    // only an origin comparison keeps the token off it.
    [
      'a host that merely starts with the app URL',
      `${APP_URL}.attacker.example/flow.json`,
    ],
    // Same host, different port: still a different origin.
    ['the app host on another port', 'https://app.example.test:8443/flow.json'],
  ])('sends no Authorization header to %s', async (_label, url) => {
    const { fetchFn, calls } = recorder();
    globalThis.fetch = fetchFn;

    await fetchContentString(url);

    expect(calls[0]?.url).toBe(url);
    expect(calls[0]?.authorization).toBeUndefined();
  });

  it('reads an app URL over plain http, since no credential goes along', async () => {
    const { fetchFn, calls } = recorder();
    globalThis.fetch = fetchFn;
    process.env.WALKEROS_APP_URL = 'http://app.example.test';

    await fetchContentString(
      'http://app.example.test/api/flow-config/signed-abc',
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.authorization).toBeUndefined();
  });

  it('leaves a plain http URL that carries no bearer alone', async () => {
    const { fetchFn, calls } = recorder();
    globalThis.fetch = fetchFn;

    await fetchContentString('http://attacker.example/flow.json');

    expect(calls[0]?.authorization).toBeUndefined();
  });

  it('returns the body it fetched', async () => {
    const { fetchFn } = recorder();
    globalThis.fetch = fetchFn;

    await expect(
      fetchContentString('https://attacker.example/flow.json'),
    ).resolves.toBe('{}');
  });
});

describe('fetchContentString failures', () => {
  const originalEnv = process.env;
  const originalFetch = globalThis.fetch;
  const URL_ = 'https://config.example.test/flow.json';

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.WALKEROS_TOKEN;
  });

  afterEach(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
  });

  it.each([404, 403, 410])('names HTTP %i and the URL', async (status) => {
    globalThis.fetch = async () => new Response('{}', { status });
    await expect(fetchContentString(URL_)).rejects.toThrow(
      new RegExp(`^Failed to fetch ${URL_.replace(/\./g, '\\.')}: ${status}`),
    );
  });

  it('names an unreachable host with the network code', async () => {
    globalThis.fetch = async () => {
      throw Object.assign(new TypeError('fetch failed'), {
        cause: Object.assign(new Error('connect ECONNREFUSED'), {
          code: 'ECONNREFUSED',
        }),
      });
    };
    await expect(fetchContentString(URL_)).rejects.toThrow(
      `Could not reach ${URL_}: fetch failed (ECONNREFUSED)`,
    );
  });

  it('loadJsonConfig keeps a reach failure instead of calling it invalid JSON', async () => {
    globalThis.fetch = async () => {
      throw new TypeError('fetch failed');
    };
    await expect(loadJsonConfig(URL_)).rejects.toThrow(/^Could not reach /);
  });
});
