const mockGetApiConfig = jest.fn().mockReturnValue({
  token: 'sk-walkeros-test',
  baseUrl: 'https://app.walkeros.io',
});

jest.mock('../../api/client.js', () => ({
  getApiConfig: mockGetApiConfig,
}));

function createMockServer() {
  const tools: Record<string, { config: unknown; handler: Function }> = {};
  return {
    registerTool(name: string, config: unknown, handler: Function) {
      tools[name] = { config, handler };
    },
    getTool(name: string) {
      return tools[name];
    },
  };
}

describe('bundle-remote tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(async () => {
    mockGetApiConfig.mockReturnValue({
      token: 'sk-walkeros-test',
      baseUrl: 'https://app.walkeros.io',
    });
    global.fetch = jest.fn() as any;
    server = createMockServer();
    const { registerBundleRemoteTool } =
      await import('../../tools/bundle-remote.js');
    registerBundleRemoteTool(server as any);
  });

  afterEach(() => jest.clearAllMocks());

  it('should register with correct metadata', () => {
    const tool = server.getTool('bundle-remote');
    expect(tool).toBeDefined();
    expect((tool.config as any).title).toBe('Bundle Remote');
    expect((tool.config as any).annotations.readOnlyHint).toBe(true);
  });

  it('should POST config and return JS bundle', async () => {
    const mockJs = '(()=>{console.log("bundle")})();';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockJs),
      headers: new Map(),
    }) as any;

    const tool = server.getTool('bundle-remote');
    const result = await tool.handler({ content: { version: 1 } });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.success).toBe(true);
    expect(parsed.bundle).toBe(mockJs);
    expect(parsed.size).toBe(mockJs.length);
  });

  it('should include stats from header when present', async () => {
    const mockJs = 'bundle();';
    const headers = new Map([
      ['X-Bundle-Stats', JSON.stringify({ destinations: 2, sources: 1 })],
    ]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockJs),
      headers: { get: (key: string) => headers.get(key) ?? null },
    }) as any;

    const tool = server.getTool('bundle-remote');
    const result = await tool.handler({ content: { version: 1 } });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.stats).toEqual({ destinations: 2, sources: 1 });
  });

  it('should return error on API failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          error: { message: 'Invalid config' },
        }),
    }) as any;

    const tool = server.getTool('bundle-remote');
    const result = await tool.handler({ content: {} });

    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('Invalid config');
  });

  it('should send correct request to /api/bundle', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('code'),
      headers: { get: () => null },
    });
    global.fetch = mockFetch as any;

    const content = { version: 1, sources: [] };
    const tool = server.getTool('bundle-remote');
    await tool.handler({ content });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://app.walkeros.io/api/bundle',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ flow: content }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });
});
