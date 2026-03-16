import {
  registerGetPackageSchemaTool,
  registerPackageSearchTool,
} from '../../tools/package.js';
import { PackageSchemaOutputShape } from '../../schemas/output.js';
import { PACKAGE_REGISTRY } from '../../registry.js';

jest.mock('@walkeros/core', () => {
  const actual = jest.requireActual('@walkeros/core');
  return {
    fetchPackage: jest.fn(),
    mergeConfigSchema: actual.mergeConfigSchema,
    mcpResult: jest.fn((result, summary, hints) => ({
      content: [
        { type: 'text', text: summary ?? JSON.stringify(result, null, 2) },
      ],
      structuredContent: hints ? { ...result, _hints: hints } : result,
    })),
    mcpError: jest.fn((error) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
        },
      ],
      isError: true,
    })),
  };
});

import { fetchPackage } from '@walkeros/core';
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

  it('should fetch package info', async () => {
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

    const content = result.structuredContent;
    expect(content.package).toBe('@walkeros/web-destination-snowplow');
    expect((content.schemas as Record<string, unknown>).config).toBeDefined();
    expect(content.type).toBe('destination');
  });

  it('should return error when package not found', async () => {
    mockFetchPackage.mockRejectedValue(
      new Error('Package "nonexistent" not found on npm (HTTP 404)'),
    );

    const tool = mockServer.getTool('package_get');
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

    const content = result.structuredContent;
    expect(content.hints).toBeDefined();
    const hints = content.hints as Record<string, unknown>;
    expect(Object.keys(hints)).toHaveLength(2);
    expect(hints['auth-default']).toEqual({
      text: 'Use default credentials on GCP',
    });
    expect(hints['query-tips']).toEqual({
      text: 'Use JSON_EXTRACT_SCALAR',
    });
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
    expect(content.examples).toBeDefined();
    const hints = content.hints as Record<string, unknown>;
    expect(hints['setup']).toEqual({ text: 'Install SDK first' });
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

  it('should return merged config schema with base + package settings', async () => {
    mockFetchPackage.mockResolvedValue({
      packageName: '@walkeros/web-source-browser',
      version: '3.0.0',
      description: undefined,
      type: 'source',
      platform: 'web',
      schemas: {
        settings: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: {
            pageview: { type: 'boolean', default: true },
          },
          additionalProperties: false,
        },
      },
      examples: {},
      hintKeys: [],
      exampleSummaries: [],
    });

    const tool = mockServer.getTool('package_get');
    const result = await tool.handler({
      package: '@walkeros/web-source-browser',
    });

    const schemas = result.structuredContent.schemas as Record<string, unknown>;

    // config key exists with merged schema
    expect(schemas.config).toBeDefined();
    const config = schemas.config as Record<string, unknown>;
    const props = config.properties as Record<string, unknown>;

    // Base source fields present
    expect(props.consent).toBeDefined();
    expect(props.require).toBeDefined();
    expect(props.logger).toBeDefined();

    // Package settings merged in
    const settings = props.settings as Record<string, unknown>;
    expect((settings.properties as any).pageview).toBeDefined();

    // Runtime-only fields excluded
    expect(props.env).toBeUndefined();
    expect(props.onError).toBeUndefined();
  });

  it('should return merged destination config schema', async () => {
    mockFetchPackage.mockResolvedValue({
      packageName: '@walkeros/web-destination-api',
      version: '3.0.0',
      description: undefined,
      type: 'destination',
      platform: 'web',
      schemas: {
        settings: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            transport: { type: 'string' },
          },
        },
      },
      examples: {},
      hintKeys: [],
      exampleSummaries: [],
    });

    const tool = mockServer.getTool('package_get');
    const result = await tool.handler({
      package: '@walkeros/web-destination-api',
    });

    const schemas = result.structuredContent.schemas as Record<string, unknown>;
    const config = schemas.config as Record<string, unknown>;
    const props = config.properties as Record<string, unknown>;

    // Destination-specific base fields
    expect(props.queue).toBeDefined();
    expect(props.require).toBeDefined();

    // Source-only fields absent
    expect(props.ingest).toBeUndefined();
  });

  it('should keep non-config schemas as siblings', async () => {
    mockFetchPackage.mockResolvedValue({
      packageName: '@walkeros/web-destination-gtag',
      version: '3.0.0',
      description: undefined,
      type: 'destination',
      platform: 'web',
      schemas: {
        settings: { type: 'object', properties: {} },
        mapping: { type: 'object', properties: { ga4: {} } },
        ga4: { type: 'object', properties: { measurementId: {} } },
      },
      examples: {},
      hintKeys: [],
      exampleSummaries: [],
    });

    const tool = mockServer.getTool('package_get');
    const result = await tool.handler({
      package: '@walkeros/web-destination-gtag',
    });

    const schemas = result.structuredContent.schemas as Record<string, unknown>;

    // config is merged
    expect(schemas.config).toBeDefined();

    // mapping and ga4 remain as siblings (not merged into config)
    expect(schemas.mapping).toBeDefined();
    expect(schemas.ga4).toBeDefined();

    // original settings key removed (replaced by config)
    expect(schemas.settings).toBeUndefined();
  });
});

describe('package_search tool', () => {
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockServer = createMockServer();
    registerPackageSearchTool(mockServer as any);
  });

  it('should register with correct name', () => {
    const tool = mockServer.getTool('package_search');
    expect(tool).toBeDefined();
  });

  it('should return metadata for lookup mode', async () => {
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

    const content = result.structuredContent;
    expect(content.package).toBe('@walkeros/web-destination-snowplow');
    expect(content.version).toBe('0.0.12');
    expect(content.description).toBe('Snowplow destination for walkerOS');
  });

  it('should return error when package not found', async () => {
    mockFetchPackage.mockRejectedValue(
      new Error('Package "nonexistent" not found on npm (HTTP 404)'),
    );

    const tool = mockServer.getTool('package_search');
    const result = await tool.handler({ package: 'nonexistent' });
    expect(result.isError).toBe(true);
  });

  it('should return full catalog in browse mode as wrapped object', async () => {
    const tool = mockServer.getTool('package_search');
    const result = await tool.handler({});

    expect(mockFetchPackage).not.toHaveBeenCalled();
    expect(result.structuredContent.catalog).toBeDefined();
    expect(Array.isArray(result.structuredContent.catalog)).toBe(true);
    expect(result.structuredContent.count).toBe(PACKAGE_REGISTRY.length);
  });

  it('should filter catalog by type', async () => {
    const tool = mockServer.getTool('package_search');
    const result = await tool.handler({ type: 'destination' });

    expect(mockFetchPackage).not.toHaveBeenCalled();
    const catalog = result.structuredContent.catalog;
    expect(catalog.length).toBeGreaterThan(0);
    expect(catalog.every((p: any) => p.type === 'destination')).toBe(true);
  });

  it('should filter catalog by platform', async () => {
    const tool = mockServer.getTool('package_search');
    const result = await tool.handler({ platform: 'web' });

    const catalog = result.structuredContent.catalog;
    expect(catalog.length).toBeGreaterThan(0);
    expect(
      catalog.every(
        (p: any) => p.platform === 'web' || p.platform === 'universal',
      ),
    ).toBe(true);
  });

  it('should filter catalog by type and platform', async () => {
    const tool = mockServer.getTool('package_search');
    const result = await tool.handler({
      type: 'source',
      platform: 'server',
    });

    const catalog = result.structuredContent.catalog;
    expect(catalog.length).toBeGreaterThan(0);
    expect(
      catalog.every(
        (p: any) =>
          p.type === 'source' &&
          (p.platform === 'server' || p.platform === 'universal'),
      ),
    ).toBe(true);
  });
});
