const mockApiRequest = jest.fn();

jest.mock('@walkeros/cli', () => ({
  apiRequest: mockApiRequest,
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

function mockResponse(body: string, headers?: Record<string, string>) {
  return {
    text: () => Promise.resolve(body),
    headers: {
      get: (key: string) => headers?.[key] ?? null,
    },
  };
}

describe('bundle-remote tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(async () => {
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
    mockApiRequest.mockResolvedValue(mockResponse(mockJs));

    const tool = server.getTool('bundle-remote');
    const result = await tool.handler({ content: { version: 1 } });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.success).toBe(true);
    expect(parsed.bundle).toBe(mockJs);
    expect(parsed.size).toBe(mockJs.length);
  });

  it('should include stats from header when present', async () => {
    const mockJs = 'bundle();';
    mockApiRequest.mockResolvedValue(
      mockResponse(mockJs, {
        'X-Bundle-Stats': JSON.stringify({ destinations: 2, sources: 1 }),
      }),
    );

    const tool = server.getTool('bundle-remote');
    const result = await tool.handler({ content: { version: 1 } });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.stats).toEqual({ destinations: 2, sources: 1 });
  });

  it('should return error on API failure', async () => {
    mockApiRequest.mockRejectedValue(new Error('Invalid config'));

    const tool = server.getTool('bundle-remote');
    const result = await tool.handler({ content: {} });

    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('Invalid config');
  });

  it('should call apiRequest with correct path and options', async () => {
    mockApiRequest.mockResolvedValue(mockResponse('code', {}));

    const content = { version: 1, sources: [] };
    const tool = server.getTool('bundle-remote');
    await tool.handler({ content });

    expect(mockApiRequest).toHaveBeenCalledWith('/api/bundle', {
      method: 'POST',
      body: JSON.stringify({ flow: content }),
      responseFormat: 'raw',
    });
  });
});
