import { registerGetPackageSchemaTool } from '../../tools/get-package-schema.js';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

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

describe('get-package-schema tool', () => {
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockServer = createMockServer();
    registerGetPackageSchemaTool(mockServer as any);
  });

  it('should register with correct name', () => {
    expect(mockServer.getTool('get-package-schema')).toBeDefined();
  });

  it('should fetch package.json then walkerOS.json from jsdelivr', async () => {
    const mockPkgJson = {
      name: '@walkeros/web-destination-snowplow',
      version: '0.0.12',
      walkerOS: {
        type: 'destination',
        platform: 'web',
        schema: './dist/dev/walkerOS.json',
      },
    };
    const mockWalkerOSJson = {
      schemas: { settings: { type: 'object', properties: {} } },
      examples: { mapping: {} },
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPkgJson),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWalkerOSJson),
      });

    const tool = mockServer.getTool('get-package-schema');
    const result = await tool.handler({
      package: '@walkeros/web-destination-snowplow',
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        'cdn.jsdelivr.net/npm/@walkeros/web-destination-snowplow',
      ),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    const content = JSON.parse(result.content[0].text);
    expect(content.package).toBe('@walkeros/web-destination-snowplow');
    expect(content.schemas.settings).toBeDefined();
    expect(content.type).toBe('destination');
  });

  it('should use default schema path when walkerOS field is missing', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: 'some-pkg', version: '1.0.0' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ schemas: { settings: {} } }),
      });

    const tool = mockServer.getTool('get-package-schema');
    await tool.handler({ package: 'some-pkg' });

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('dist/dev/walkerOS.json'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('should return error when package not found', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const tool = mockServer.getTool('get-package-schema');
    const result = await tool.handler({ package: 'nonexistent' });
    expect(result.isError).toBe(true);
  });

  it('should return error when walkerOS.json not found', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: 'pkg', version: '1.0.0' }),
      })
      .mockResolvedValueOnce({ ok: false, status: 404 });

    const tool = mockServer.getTool('get-package-schema');
    const result = await tool.handler({ package: 'pkg' });
    expect(result.isError).toBe(true);
  });

  it('should support version parameter', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: 'pkg', version: '2.0.0' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ schemas: {} }),
      });

    const tool = mockServer.getTool('get-package-schema');
    await tool.handler({ package: 'pkg', version: '2.0.0' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('pkg@2.0.0'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
