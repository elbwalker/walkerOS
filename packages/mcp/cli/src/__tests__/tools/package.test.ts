import {
  registerGetPackageSchemaTool,
  registerPackageSearchTool,
} from '../../tools/package.js';
import {
  PackageSchemaOutputShape,
  PackageSearchOutputShape,
} from '../../schemas/output.js';
import { fetchPackageSchema, fetchPackageMeta } from '@walkeros/core';

jest.mock('@walkeros/core', () => ({
  fetchPackageSchema: jest.fn(),
  fetchPackageMeta: jest.fn(),
}));

const mockFetchPackageSchema = fetchPackageSchema as jest.MockedFunction<
  typeof fetchPackageSchema
>;
const mockFetchPackageMeta = fetchPackageMeta as jest.MockedFunction<
  typeof fetchPackageMeta
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

describe('package_get tool', () => {
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockServer = createMockServer();
    registerGetPackageSchemaTool(mockServer as any);
  });

  it('should register with correct name and outputSchema', () => {
    const tool = mockServer.getTool('package_get');
    expect(tool).toBeDefined();
    expect((tool.config as any).outputSchema).toBe(PackageSchemaOutputShape);
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

    const tool = mockServer.getTool('package_get');
    const result = await tool.handler({
      package: '@walkeros/web-destination-snowplow',
    });

    expect(mockFetchPackageSchema).toHaveBeenCalledWith(
      '@walkeros/web-destination-snowplow',
      { version: undefined },
    );

    expect(result.content[0].text).toContain(
      '@walkeros/web-destination-snowplow',
    );
    const content = result.structuredContent;
    expect(content.package).toBe('@walkeros/web-destination-snowplow');
    expect((content.schemas as Record<string, unknown>).settings).toBeDefined();
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

    const tool = mockServer.getTool('package_get');
    const result = await tool.handler({ package: 'some-pkg' });

    expect(mockFetchPackageSchema).toHaveBeenCalledWith('some-pkg', {
      version: undefined,
    });
    expect(result.content[0].text).toContain('some-pkg');
    const content = result.structuredContent;
    expect(content.package).toBe('some-pkg');
  });

  it('should return error when package not found', async () => {
    mockFetchPackageSchema.mockRejectedValue(
      new Error('Package "nonexistent" not found on npm (HTTP 404)'),
    );

    const tool = mockServer.getTool('package_get');
    const result = await tool.handler({ package: 'nonexistent' });
    expect(result.isError).toBe(true);
  });

  it('should return error when walkerOS.json not found', async () => {
    mockFetchPackageSchema.mockRejectedValue(
      new Error('walkerOS.json not found at dist/walkerOS.json (HTTP 404)'),
    );

    const tool = mockServer.getTool('package_get');
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

    const tool = mockServer.getTool('package_get');
    await tool.handler({ package: 'pkg', version: '2.0.0' });

    expect(mockFetchPackageSchema).toHaveBeenCalledWith('pkg', {
      version: '2.0.0',
    });
  });

  it('should include hints when present', async () => {
    mockFetchPackageSchema.mockResolvedValue({
      packageName: '@walkeros/server-destination-gcp',
      version: '2.1.1',
      type: 'destination',
      platform: 'server',
      schemas: { settings: {} },
      examples: { mapping: {} },
      hints: {
        'auth-default': { text: 'Use default credentials on GCP' },
        'query-tips': {
          text: 'Use JSON_EXTRACT_SCALAR',
          code: [{ lang: 'sql', code: 'SELECT 1' }],
        },
      },
    });

    const tool = mockServer.getTool('package_get');
    const result = await tool.handler({
      package: '@walkeros/server-destination-gcp',
    });

    expect(result.content[0].text).toContain('2 hints');
    const content = result.structuredContent;
    expect(content.hints).toBeDefined();
    const hints = content.hints as Record<string, unknown>;
    expect(Object.keys(hints)).toHaveLength(2);
    expect(hints['auth-default']).toEqual({
      text: 'Use default credentials on GCP',
    });
  });

  it('should work without hints (backward compat)', async () => {
    mockFetchPackageSchema.mockResolvedValue({
      packageName: 'pkg',
      version: '1.0.0',
      type: 'destination',
      platform: 'web',
      schemas: { settings: {} },
      examples: {},
    });

    const tool = mockServer.getTool('package_get');
    const result = await tool.handler({ package: 'pkg' });

    expect(result.content[0].text).not.toContain('hints');
    const content = result.structuredContent;
    expect(content.hints).toBeUndefined();
  });
});

describe('package_search tool', () => {
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockServer = createMockServer();
    registerPackageSearchTool(mockServer as any);
  });

  it('should register with correct name and outputSchema', () => {
    const tool = mockServer.getTool('package_search');
    expect(tool).toBeDefined();
    expect((tool.config as any).outputSchema).toBe(PackageSearchOutputShape);
  });

  it('should return lightweight metadata without schemas/examples', async () => {
    mockFetchPackageMeta.mockResolvedValue({
      packageName: '@walkeros/web-destination-snowplow',
      version: '0.0.12',
      description: 'Snowplow destination for walkerOS',
      type: 'destination',
      platform: 'web',
    });

    const tool = mockServer.getTool('package_search');
    const result = await tool.handler({
      package: '@walkeros/web-destination-snowplow',
    });

    expect(mockFetchPackageMeta).toHaveBeenCalledWith(
      '@walkeros/web-destination-snowplow',
      { version: undefined },
    );

    const content = JSON.parse(result.content[0].text);
    expect(content.package).toBe('@walkeros/web-destination-snowplow');
    expect(content.version).toBe('0.0.12');
    expect(content.description).toBe('Snowplow destination for walkerOS');
    expect(content.type).toBe('destination');
    expect(content).not.toHaveProperty('schemas');
    expect(content).not.toHaveProperty('examples');
  });

  it('should return error when package not found', async () => {
    mockFetchPackageMeta.mockRejectedValue(
      new Error('Package "nonexistent" not found on npm (HTTP 404)'),
    );

    const tool = mockServer.getTool('package_search');
    const result = await tool.handler({ package: 'nonexistent' });
    expect(result.isError).toBe(true);
  });

  it('should support version parameter', async () => {
    mockFetchPackageMeta.mockResolvedValue({
      packageName: 'pkg',
      version: '2.0.0',
      type: undefined,
      platform: undefined,
    });

    const tool = mockServer.getTool('package_search');
    await tool.handler({ package: 'pkg', version: '2.0.0' });

    expect(mockFetchPackageMeta).toHaveBeenCalledWith('pkg', {
      version: '2.0.0',
    });
  });
});
