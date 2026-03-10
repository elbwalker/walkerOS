import {
  registerGetPackageSchemaTool,
  registerPackageSearchTool,
} from '../../tools/package.js';
import {
  PackageSchemaOutputShape,
  PackageSearchOutputShape,
} from '../../schemas/output.js';
import { fetchPackage } from '@walkeros/core';

jest.mock('@walkeros/core', () => ({
  fetchPackage: jest.fn(),
}));

const mockFetchPackage = fetchPackage as jest.MockedFunction<
  typeof fetchPackage
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

  it('should fetch package info from jsdelivr', async () => {
    mockFetchPackage.mockResolvedValue({
      packageName: '@walkeros/web-destination-snowplow',
      version: '0.0.12',
      description: undefined,
      type: 'destination',
      platform: 'web',
      schemas: { settings: { type: 'object', properties: {} } },
      examples: { mapping: {} },
      hintKeys: [],
      exampleSummaries: [],
    });

    const tool = mockServer.getTool('package_get');
    const result = await tool.handler({
      package: '@walkeros/web-destination-snowplow',
    });

    expect(mockFetchPackage).toHaveBeenCalledWith(
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

  it('should handle packages without type/platform', async () => {
    mockFetchPackage.mockResolvedValue({
      packageName: 'some-pkg',
      version: '1.0.0',
      description: undefined,
      type: undefined,
      platform: undefined,
      schemas: { settings: {} },
      examples: {},
      hintKeys: [],
      exampleSummaries: [],
    });

    const tool = mockServer.getTool('package_get');
    const result = await tool.handler({ package: 'some-pkg' });

    expect(mockFetchPackage).toHaveBeenCalledWith('some-pkg', {
      version: undefined,
    });
    expect(result.content[0].text).toContain('some-pkg');
    const content = result.structuredContent;
    expect(content.package).toBe('some-pkg');
  });

  it('should return error when package not found', async () => {
    mockFetchPackage.mockRejectedValue(
      new Error('Package "nonexistent" not found on npm (HTTP 404)'),
    );

    const tool = mockServer.getTool('package_get');
    const result = await tool.handler({ package: 'nonexistent' });
    expect(result.isError).toBe(true);
  });

  it('should return error when walkerOS.json not found', async () => {
    mockFetchPackage.mockRejectedValue(
      new Error('walkerOS.json not found at dist/walkerOS.json (HTTP 404)'),
    );

    const tool = mockServer.getTool('package_get');
    const result = await tool.handler({ package: 'pkg' });
    expect(result.isError).toBe(true);
  });

  it('should support version parameter', async () => {
    mockFetchPackage.mockResolvedValue({
      packageName: 'pkg',
      version: '2.0.0',
      description: undefined,
      type: undefined,
      platform: undefined,
      schemas: {},
      examples: {},
      hintKeys: [],
      exampleSummaries: [],
    });

    const tool = mockServer.getTool('package_get');
    await tool.handler({ package: 'pkg', version: '2.0.0' });

    expect(mockFetchPackage).toHaveBeenCalledWith('pkg', {
      version: '2.0.0',
    });
  });

  it('should include hint text summaries by default (no code blocks)', async () => {
    mockFetchPackage.mockResolvedValue({
      packageName: '@walkeros/server-destination-gcp',
      version: '2.1.1',
      description: undefined,
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
      hintKeys: ['auth-default', 'query-tips'],
      exampleSummaries: [],
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
    // Summary mode: text only, no code blocks
    expect(hints['auth-default']).toEqual({
      text: 'Use default credentials on GCP',
    });
    expect(hints['query-tips']).toEqual({
      text: 'Use JSON_EXTRACT_SCALAR',
    });
  });

  it('should work without hints (backward compat)', async () => {
    mockFetchPackage.mockResolvedValue({
      packageName: 'pkg',
      version: '1.0.0',
      description: undefined,
      type: 'destination',
      platform: 'web',
      schemas: { settings: {} },
      examples: {},
      hintKeys: [],
      exampleSummaries: [],
    });

    const tool = mockServer.getTool('package_get');
    const result = await tool.handler({ package: 'pkg' });

    expect(result.content[0].text).not.toContain('hints');
    const content = result.structuredContent;
    expect(content.hints).toBeUndefined();
  });

  it('should return summary by default (no section)', async () => {
    mockFetchPackage.mockResolvedValue({
      packageName: '@walkeros/server-destination-gcp',
      version: '2.1.1',
      description: undefined,
      type: 'destination',
      platform: 'server',
      schemas: { settings: { type: 'object' } },
      examples: {
        step: {
          purchase: { description: 'BQ purchase', in: {}, out: [] },
        },
      },
      hints: {
        'auth-methods': { text: 'Three auth methods' },
        'query-tips': {
          text: 'Use JSON_EXTRACT',
          code: [{ lang: 'sql', code: 'SELECT 1' }],
        },
      },
      hintKeys: ['auth-methods', 'query-tips'],
      exampleSummaries: [{ name: 'purchase', description: 'BQ purchase' }],
    });

    const tool = mockServer.getTool('package_get');
    const result = await tool.handler({
      package: '@walkeros/server-destination-gcp',
    });

    const content = result.structuredContent;
    expect(content.schemas).toBeDefined();
    expect(content.hints).toBeDefined();
    const hints = content.hints as Record<string, unknown>;
    expect(hints['auth-methods']).toEqual({ text: 'Three auth methods' });
    expect(hints['query-tips']).toEqual({ text: 'Use JSON_EXTRACT' });
    expect(content.exampleSummaries).toEqual([
      { name: 'purchase', description: 'BQ purchase' },
    ]);
    expect(content.examples).toBeUndefined();
  });

  it('should return full hints when section=hints', async () => {
    mockFetchPackage.mockResolvedValue({
      packageName: 'pkg',
      version: '1.0.0',
      description: undefined,
      type: 'destination',
      platform: 'server',
      schemas: {},
      examples: {},
      hints: {
        'query-tips': {
          text: 'Use JSON_EXTRACT',
          code: [{ lang: 'sql', code: 'SELECT 1' }],
        },
      },
      hintKeys: ['query-tips'],
      exampleSummaries: [],
    });

    const tool = mockServer.getTool('package_get');
    const result = await tool.handler({ package: 'pkg', section: 'hints' });

    const content = result.structuredContent;
    const hints = content.hints as Record<string, unknown>;
    expect(hints['query-tips']).toEqual({
      text: 'Use JSON_EXTRACT',
      code: [{ lang: 'sql', code: 'SELECT 1' }],
    });
    expect(content.schemas).toBeDefined();
  });

  it('should return full examples when section=examples', async () => {
    mockFetchPackage.mockResolvedValue({
      packageName: 'pkg',
      version: '1.0.0',
      description: undefined,
      type: 'destination',
      platform: 'web',
      schemas: {},
      examples: {
        step: {
          purchase: {
            description: 'Buy',
            in: { event: 'order' },
            out: ['event', 'purchase', {}],
          },
        },
      },
      hints: {
        setup: { text: 'Install SDK first', code: [{ code: 'npm i sdk' }] },
      },
      hintKeys: ['setup'],
      exampleSummaries: [{ name: 'purchase', description: 'Buy' }],
    });

    const tool = mockServer.getTool('package_get');
    const result = await tool.handler({ package: 'pkg', section: 'examples' });

    const content = result.structuredContent;
    expect(content.examples).toBeDefined(); // full examples included
    expect(content.schemas).toBeDefined();
    // hints still included as text-only summaries (section expands examples, not strips hints)
    const hints = content.hints as Record<string, unknown>;
    expect(hints['setup']).toEqual({ text: 'Install SDK first' }); // code blocks stripped
  });

  it('should return full content when section=all', async () => {
    mockFetchPackage.mockResolvedValue({
      packageName: 'pkg',
      version: '1.0.0',
      description: undefined,
      type: 'destination',
      platform: 'web',
      schemas: { settings: {} },
      examples: { step: { p: { in: {}, out: [] } } },
      hints: { a: { text: 'hi', code: [{ code: 'x' }] } },
      hintKeys: ['a'],
      exampleSummaries: [{ name: 'p' }],
    });

    const tool = mockServer.getTool('package_get');
    const result = await tool.handler({ package: 'pkg', section: 'all' });

    const content = result.structuredContent;
    expect(content.schemas).toBeDefined();
    expect(content.examples).toBeDefined();
    expect(content.hints).toBeDefined();
    const hints = content.hints as Record<
      string,
      { text: string; code?: unknown[] }
    >;
    expect(hints['a'].code).toBeDefined();
    expect(content.exampleSummaries).toBeUndefined();
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

  it('should return metadata with hint keys and example summaries', async () => {
    mockFetchPackage.mockResolvedValue({
      packageName: '@walkeros/web-destination-snowplow',
      version: '0.0.12',
      description: 'Snowplow destination for walkerOS',
      type: 'destination',
      platform: 'web',
      schemas: {},
      examples: {},
      hintKeys: [],
      exampleSummaries: [],
    });

    const tool = mockServer.getTool('package_search');
    const result = await tool.handler({
      package: '@walkeros/web-destination-snowplow',
    });

    expect(mockFetchPackage).toHaveBeenCalledWith(
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
    mockFetchPackage.mockRejectedValue(
      new Error('Package "nonexistent" not found on npm (HTTP 404)'),
    );

    const tool = mockServer.getTool('package_search');
    const result = await tool.handler({ package: 'nonexistent' });
    expect(result.isError).toBe(true);
  });

  it('should support version parameter', async () => {
    mockFetchPackage.mockResolvedValue({
      packageName: 'pkg',
      version: '2.0.0',
      description: undefined,
      type: undefined,
      platform: undefined,
      schemas: {},
      examples: {},
      hintKeys: [],
      exampleSummaries: [],
    });

    const tool = mockServer.getTool('package_search');
    await tool.handler({ package: 'pkg', version: '2.0.0' });

    expect(mockFetchPackage).toHaveBeenCalledWith('pkg', {
      version: '2.0.0',
    });
  });

  it('should return hint keys and example summaries', async () => {
    mockFetchPackage.mockResolvedValue({
      packageName: '@walkeros/web-destination-gtag',
      version: '2.1.1',
      description: 'Google gtag destination',
      type: 'destination',
      platform: 'web',
      schemas: { settings: {} },
      examples: {
        step: { purchase: { description: 'GA4 purchase', in: {}, out: [] } },
      },
      hints: { 'consent-mode': { text: 'Consent Mode v2' } },
      hintKeys: ['consent-mode'],
      exampleSummaries: [{ name: 'purchase', description: 'GA4 purchase' }],
    });

    const tool = mockServer.getTool('package_search');
    const result = await tool.handler({
      package: '@walkeros/web-destination-gtag',
    });

    const content = JSON.parse(result.content[0].text);
    expect(content.hintKeys).toEqual(['consent-mode']);
    expect(content.exampleSummaries).toEqual([
      { name: 'purchase', description: 'GA4 purchase' },
    ]);
    expect(content).not.toHaveProperty('schemas');
    expect(content).not.toHaveProperty('examples');
    expect(content).not.toHaveProperty('hints');
  });
});
