import { createApiClient } from '../../../core/api-client.js';
import { resolveAccessToken } from '../../../core/auth.js';

jest.mock('../../../core/auth.js', () => ({
  resolveAccessToken: jest.fn(),
}));

jest.mock('../../../lib/config-file.js', () => ({
  resolveAppUrl: jest.fn().mockReturnValue('https://app.walkeros.io'),
}));

const mockResolveAccessToken = jest.mocked(resolveAccessToken);

describe('createApiClient', () => {
  const originalFetch = global.fetch;
  let sentAuthorization: Array<string | null>;

  beforeEach(() => {
    sentAuthorization = [];
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : null;
      sentAuthorization.push(request?.headers.get('authorization') ?? null);
      return new Response(JSON.stringify({ projects: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('creates a client with GET and POST methods', () => {
    const client = createApiClient();
    expect(client).toBeDefined();
    expect(typeof client.GET).toBe('function');
    expect(typeof client.POST).toBe('function');
    expect(typeof client.PATCH).toBe('function');
    expect(typeof client.DELETE).toBe('function');
  });

  it('does not resolve a token until a request is made', () => {
    createApiClient();
    expect(mockResolveAccessToken).not.toHaveBeenCalled();
  });

  it('attaches the resolved bearer to the outgoing request', async () => {
    mockResolveAccessToken.mockResolvedValue('at_first');
    const client = createApiClient();

    await client.GET('/api/projects');

    expect(sentAuthorization).toEqual(['Bearer at_first']);
  });

  it('resolves the token per request, so a refresh reaches a long-lived client', async () => {
    // The stdio MCP server builds one client and keeps it for hours. A token
    // captured at construction would go stale and never recover.
    mockResolveAccessToken
      .mockResolvedValueOnce('at_first')
      .mockResolvedValueOnce('at_refreshed');
    const client = createApiClient();

    await client.GET('/api/projects');
    await client.GET('/api/projects');

    expect(sentAuthorization).toEqual([
      'Bearer at_first',
      'Bearer at_refreshed',
    ]);
  });

  it('throws when no token resolves', async () => {
    mockResolveAccessToken.mockResolvedValue(null);
    const client = createApiClient();

    await expect(client.GET('/api/projects')).rejects.toThrow(
      'Not authenticated',
    );
  });
});
