import { registerGetPackageSchemaTool } from '../../tools/get-package-schema.js';
import { fetchPackageSchema } from '@walkeros/core';

jest.mock('@walkeros/core', () => ({
  fetchPackageSchema: jest.fn(),
}));

const mockFetchPackageSchema = fetchPackageSchema as jest.MockedFunction<
  typeof fetchPackageSchema
>;

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
    mockFetchPackageSchema.mockResolvedValue({
      packageName: '@walkeros/web-destination-snowplow',
      version: '0.0.12',
      type: 'destination',
      platform: 'web',
      schemas: { settings: { type: 'object', properties: {} } },
      examples: { mapping: {} },
    });

    const tool = mockServer.getTool('get-package-schema');
    const result = await tool.handler({
      package: '@walkeros/web-destination-snowplow',
    });

    expect(mockFetchPackageSchema).toHaveBeenCalledWith(
      '@walkeros/web-destination-snowplow',
      { version: undefined },
    );

    const content = JSON.parse(result.content[0].text);
    expect(content.package).toBe('@walkeros/web-destination-snowplow');
    expect(content.schemas.settings).toBeDefined();
    expect(content.type).toBe('destination');
  });

  it('should use default schema path when walkerOS field is missing', async () => {
    mockFetchPackageSchema.mockResolvedValue({
      packageName: 'some-pkg',
      version: '1.0.0',
      type: undefined,
      platform: undefined,
      schemas: { settings: {} },
      examples: {},
    });

    const tool = mockServer.getTool('get-package-schema');
    const result = await tool.handler({ package: 'some-pkg' });

    expect(mockFetchPackageSchema).toHaveBeenCalledWith('some-pkg', {
      version: undefined,
    });
    const content = JSON.parse(result.content[0].text);
    expect(content.package).toBe('some-pkg');
  });

  it('should return error when package not found', async () => {
    mockFetchPackageSchema.mockRejectedValue(
      new Error('Package "nonexistent" not found on npm (HTTP 404)'),
    );

    const tool = mockServer.getTool('get-package-schema');
    const result = await tool.handler({ package: 'nonexistent' });
    expect(result.isError).toBe(true);
  });

  it('should return error when walkerOS.json not found', async () => {
    mockFetchPackageSchema.mockRejectedValue(
      new Error('walkerOS.json not found at dist/dev/walkerOS.json (HTTP 404)'),
    );

    const tool = mockServer.getTool('get-package-schema');
    const result = await tool.handler({ package: 'pkg' });
    expect(result.isError).toBe(true);
  });

  it('should support version parameter', async () => {
    mockFetchPackageSchema.mockResolvedValue({
      packageName: 'pkg',
      version: '2.0.0',
      type: undefined,
      platform: undefined,
      schemas: {},
      examples: {},
    });

    const tool = mockServer.getTool('get-package-schema');
    await tool.handler({ package: 'pkg', version: '2.0.0' });

    expect(mockFetchPackageSchema).toHaveBeenCalledWith('pkg', {
      version: '2.0.0',
    });
  });
});
