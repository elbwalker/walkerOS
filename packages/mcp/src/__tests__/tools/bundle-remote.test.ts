const mockBundleRemote = jest.fn();

jest.mock('@walkeros/cli', () => ({
  bundleRemote: mockBundleRemote,
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
    mockBundleRemote.mockResolvedValue({
      bundle: mockJs,
      size: mockJs.length,
    });

    const tool = server.getTool('bundle-remote');
    const result = await tool.handler({ content: { version: 1 } });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.success).toBe(true);
    expect(parsed.bundle).toBe(mockJs);
    expect(parsed.size).toBe(mockJs.length);
  });

  it('should include stats when present', async () => {
    const mockJs = 'bundle();';
    mockBundleRemote.mockResolvedValue({
      bundle: mockJs,
      size: mockJs.length,
      stats: { destinations: 2, sources: 1 },
    });

    const tool = server.getTool('bundle-remote');
    const result = await tool.handler({ content: { version: 1 } });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.stats).toEqual({ destinations: 2, sources: 1 });
  });

  it('should return error on API failure', async () => {
    mockBundleRemote.mockRejectedValue(new Error('Invalid config'));

    const tool = server.getTool('bundle-remote');
    const result = await tool.handler({ content: {} });

    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('Invalid config');
  });

  it('should call bundleRemote with content', async () => {
    mockBundleRemote.mockResolvedValue({
      bundle: 'code',
      size: 4,
    });

    const content = { version: 1, sources: [] };
    const tool = server.getTool('bundle-remote');
    await tool.handler({ content });

    expect(mockBundleRemote).toHaveBeenCalledWith({ content });
  });
});
