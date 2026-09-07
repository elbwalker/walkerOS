import { fetchContentString } from '../../../config/utils.js';

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

describe('fetchContentString auth scoping', () => {
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

  it('sends the bearer to the configured app origin', async () => {
    const { fetchFn, calls } = recorder();
    globalThis.fetch = fetchFn;

    await fetchContentString(`${APP_URL}/api/flows/fl_1/bundle.js`);

    expect(calls[0]?.authorization).toBe(`Bearer ${TOKEN}`);
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

  it('returns the body it fetched', async () => {
    const { fetchFn } = recorder();
    globalThis.fetch = fetchFn;

    await expect(
      fetchContentString('https://attacker.example/flow.json'),
    ).resolves.toBe('{}');
  });
});
