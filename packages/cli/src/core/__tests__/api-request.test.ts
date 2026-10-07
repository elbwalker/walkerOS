import { apiRequest, operationUrl } from '../api-request.js';
import { resetClientContext, setClientContext } from '../client-context.js';

jest.mock('../../lib/config-file.js', () => ({
  resolveAppUrl: jest.fn(),
  resolveDeployToken: jest.fn(),
}));

jest.mock('../auth.js', () => ({
  resolveAccessToken: jest.fn(),
}));

import { resolveAppUrl, resolveDeployToken } from '../../lib/config-file.js';
import { resolveAccessToken } from '../auth.js';

const mockResolveAppUrl = jest.mocked(resolveAppUrl);
const mockResolveDeployToken = jest.mocked(resolveDeployToken);
const mockResolveAccessToken = jest.mocked(resolveAccessToken);

interface Sent {
  url: string;
  method?: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal | null;
  redirect?: RequestRedirect;
}

function headersOf(init: RequestInit | undefined): Record<string, string> {
  const raw = init?.headers;
  if (raw === undefined) return {};
  return Object.fromEntries(new Headers(raw).entries());
}

/** A fetch that records what it was asked to send. */
function recorder(): { fetchFn: typeof fetch; sent: Sent[] } {
  const sent: Sent[] = [];
  const fetchFn: typeof fetch = async (input, init) => {
    sent.push({
      url: String(input),
      method: init?.method,
      headers: headersOf(init),
      body: typeof init?.body === 'string' ? init.body : undefined,
      signal: init?.signal,
      redirect: init?.redirect,
    });
    return new Response('{}', { status: 200 });
  };
  return { fetchFn, sent };
}

describe('apiRequest', () => {
  const originalFetch = global.fetch;
  let globalSent: Sent[];

  beforeEach(() => {
    const { fetchFn, sent } = recorder();
    global.fetch = fetchFn;
    globalSent = sent;
    mockResolveAppUrl.mockReturnValue('https://app.test');
    mockResolveDeployToken.mockReturnValue(null);
    mockResolveAccessToken.mockResolvedValue('user-token');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    resetClientContext();
    jest.clearAllMocks();
  });

  it('fills the template with each path parameter encoded once', async () => {
    await apiRequest(
      'GET /api/projects/{projectId}/flows/{flowId}/frames/{frameId}',
      {
        path: { projectId: 'proj 1', flowId: 'flow?1', frameId: 'frm/a%20b' },
      },
    );
    expect(globalSent[0]?.url).toBe(
      'https://app.test/api/projects/proj%201/flows/flow%3F1/frames/frm%2Fa%2520b',
    );
  });

  it('serializes the query in order, leaving out undefined values', async () => {
    await apiRequest('GET /api/projects/{projectId}/knowledge', {
      path: { projectId: 'proj_1' },
      query: {
        pageKey: 'https://shop.example/cart?x=1',
        frameId: undefined,
        includeMessages: 'true',
        limit: 10,
      },
    });
    expect(globalSent[0]?.url).toBe(
      'https://app.test/api/projects/proj_1/knowledge?pageKey=https%3A%2F%2Fshop.example%2Fcart%3Fx%3D1&includeMessages=true&limit=10',
    );
  });

  it('sends a contract enum query value as declared', async () => {
    // A value outside the enum ('running') is a compile error here: the query
    // is typed exactly as the contract declares it.
    await apiRequest('GET /api/projects/{projectId}/deployments', {
      path: { projectId: 'proj_1' },
      query: { status: 'active', type: 'web' },
    });
    expect(globalSent[0]?.url).toBe(
      'https://app.test/api/projects/proj_1/deployments?status=active&type=web',
    );
  });

  it('sends no query string when every value is undefined', async () => {
    await apiRequest('GET /api/projects/{projectId}/deployments', {
      path: { projectId: 'proj_1' },
      query: { cursor: undefined },
    });
    expect(globalSent[0]?.url).toBe(
      'https://app.test/api/projects/proj_1/deployments',
    );
  });

  describe("auth 'user' (default)", () => {
    it('attaches the access token', async () => {
      await apiRequest('GET /api/auth/whoami');
      expect(globalSent[0]?.headers.authorization).toBe('Bearer user-token');
    });

    it('refuses plain http off the local machine before sending', async () => {
      mockResolveAppUrl.mockReturnValue('http://app.test');
      await expect(apiRequest('GET /api/auth/whoami')).rejects.toThrow(
        /plain http/,
      );
      expect(globalSent).toHaveLength(0);
    });

    it('applies the same rule to an explicit baseUrl', async () => {
      await expect(
        apiRequest('GET /api/auth/whoami', { baseUrl: 'http://other.test' }),
      ).rejects.toThrow(/plain http/);
      expect(globalSent).toHaveLength(0);
    });
  });

  describe("auth 'deploy'", () => {
    const op = 'GET /api/projects/{projectId}/flows/{flowId}/secrets/values';
    const path = { projectId: 'proj_1', flowId: 'flow_1' };

    it('prefers the deploy token', async () => {
      mockResolveDeployToken.mockReturnValue('deploy-token');
      await apiRequest(op, { auth: 'deploy', path });
      expect(globalSent[0]?.headers.authorization).toBe('Bearer deploy-token');
    });

    it('falls back to the access token', async () => {
      await apiRequest(op, { auth: 'deploy', path });
      expect(globalSent[0]?.headers.authorization).toBe('Bearer user-token');
    });

    it.each([
      ['through deployFetch', {}],
      ['with an explicit baseUrl', { baseUrl: 'https://other.test' }],
    ])('refuses without either token %s', async (_label, transport) => {
      mockResolveAccessToken.mockResolvedValue(null);
      await expect(
        apiRequest(op, { auth: 'deploy', path, ...transport }),
      ).rejects.toThrow(
        'No authentication token available. Set WALKEROS_DEPLOY_TOKEN or run walkeros auth login.',
      );
      expect(globalSent).toHaveLength(0);
    });
  });

  it.each([
    ['through publicFetch', {}],
    ['with an explicit baseUrl', { baseUrl: 'https://other.test' }],
  ])("auth 'none' sends no credential %s", async (_label, transport) => {
    await apiRequest('GET /api/health', { auth: 'none', ...transport });
    expect(globalSent[0]?.headers.authorization).toBeUndefined();
    expect(mockResolveAccessToken).not.toHaveBeenCalled();
  });

  it('sends exactly a given bearer', async () => {
    await apiRequest('GET /api/auth/whoami', { auth: { token: 'fresh' } });
    expect(globalSent[0]?.headers.authorization).toBe('Bearer fresh');
    expect(mockResolveAccessToken).not.toHaveBeenCalled();
  });

  it.each([
    ['through apiFetch', {}],
    ['with an explicit baseUrl', { baseUrl: 'https://other.test' }],
  ])('carries the client-context headers %s', async (_label, transport) => {
    setClientContext({ type: 'mcp', version: '9.9.9' });
    await apiRequest('GET /api/auth/whoami', transport);
    expect(globalSent[0]?.headers).toMatchObject({
      'user-agent': 'walkeros-mcp/9.9.9',
      'x-walkeros-client': 'mcp',
      'x-walkeros-client-version': '9.9.9',
    });
  });

  it('lets a caller header replace a context header in any letter case', async () => {
    setClientContext({ type: 'mcp', version: '9.9.9' });
    const { fetchFn, sent } = recorder();
    await apiRequest('GET /api/packages', {
      auth: 'none',
      fetch: fetchFn,
      headers: { 'X-Walkeros-Client': 'walkeros-mcp/9.9.9' },
    });
    expect(sent[0]?.headers['x-walkeros-client']).toBe('walkeros-mcp/9.9.9');
  });

  it('uses baseUrl instead of the resolved app URL', async () => {
    await apiRequest('GET /api/health', {
      auth: 'none',
      baseUrl: 'https://other.test',
    });
    expect(globalSent[0]?.url).toBe('https://other.test/api/health');
    expect(mockResolveAppUrl).not.toHaveBeenCalled();
  });

  it('uses an injected fetch instead of the global one', async () => {
    const { fetchFn, sent } = recorder();
    await apiRequest('GET /api/health', { auth: 'none', fetch: fetchFn });
    expect(sent.map((s) => s.url)).toEqual(['https://app.test/api/health']);
    expect(globalSent).toHaveLength(0);
  });

  it('sends a JSON body with its content type', async () => {
    await apiRequest('POST /api/feedback', {
      auth: 'none',
      body: { text: 'hello' },
    });
    expect(globalSent[0]).toMatchObject({
      method: 'POST',
      body: '{"text":"hello"}',
      headers: { 'content-type': 'application/json' },
    });
  });

  it('sends a form body with its content type, the signal and the redirect mode', async () => {
    const signal = new AbortController().signal;
    await apiRequest('POST /api/oauth/revoke', {
      auth: 'none',
      form: { token: 'rt_1', token_type_hint: 'refresh_token' },
      headers: { Accept: 'application/json' },
      signal,
      redirect: 'error',
    });
    expect(globalSent[0]).toMatchObject({
      method: 'POST',
      body: 'token=rt_1&token_type_hint=refresh_token',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
      },
      redirect: 'error',
    });
    expect(globalSent[0]?.signal).toBe(signal);
  });

  it('keeps a content type the caller set', async () => {
    await apiRequest('POST /api/feedback', {
      auth: 'none',
      body: { text: 'hello' },
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
    expect(globalSent[0]?.headers['content-type']).toBe(
      'application/json; charset=utf-8',
    );
  });
});

describe('operationUrl', () => {
  it('builds the absolute URL of an operation', () => {
    expect(
      operationUrl('POST /api/telemetry', { baseUrl: 'https://app.test' }),
    ).toBe('https://app.test/api/telemetry');
  });
});
