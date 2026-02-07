import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../api/client.js', () => ({
  getApiConfig: vi.fn().mockReturnValue({
    token: 'sk-walkeros-test',
    baseUrl: 'https://app.walkeros.io',
  }),
}));

import { getApiConfig } from '../../api/client.js';

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
    vi.mocked(getApiConfig).mockReturnValue({
      token: 'sk-walkeros-test',
      baseUrl: 'https://app.walkeros.io',
    });
    vi.stubGlobal('fetch', vi.fn());
    server = createMockServer();
    const { registerBundleRemoteTool } =
      await import('../../tools/bundle-remote.js');
    registerBundleRemoteTool(server as any);
  });

  afterEach(() => vi.clearAllMocks());

  it('should register with correct metadata', () => {
    const tool = server.getTool('bundle-remote');
    expect(tool).toBeDefined();
    expect((tool.config as any).title).toBe('Bundle Remote');
    expect((tool.config as any).annotations.readOnlyHint).toBe(true);
  });

  it('should POST config and return JS bundle', async () => {
    const mockJs = '(()=>{console.log("bundle")})();';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockJs),
        headers: new Map(),
      }),
    );

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
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockJs),
        headers: { get: (key: string) => headers.get(key) ?? null },
      }),
    );

    const tool = server.getTool('bundle-remote');
    const result = await tool.handler({ content: { version: 1 } });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.stats).toEqual({ destinations: 2, sources: 1 });
  });

  it('should return error on API failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error: { message: 'Invalid config' },
          }),
      }),
    );

    const tool = server.getTool('bundle-remote');
    const result = await tool.handler({ content: {} });

    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('Invalid config');
  });

  it('should send correct request to /api/bundle', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('code'),
      headers: { get: () => null },
    });
    vi.stubGlobal('fetch', mockFetch);

    const content = { version: 1, sources: [] };
    const tool = server.getTool('bundle-remote');
    await tool.handler({ content });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://app.walkeros.io/api/bundle',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(content),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });
});
