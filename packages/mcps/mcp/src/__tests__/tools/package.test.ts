import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  createPackageGetToolSpec,
  createPackageSearchToolSpec,
  registerGetPackageSchemaTool,
} from '../../tools/package.js';
import type { ToolSpec } from '../../tool-spec.js';
import { structured, record, isErrorResult } from '../support/tool-result.js';

jest.mock('@walkeros/core', () => {
  return {
    fetchPackage: jest.fn(),
    mcpResult: jest.fn((result, hints) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            hints ? { ...result, _hints: hints } : result,
            null,
            2,
          ),
        },
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
import { mergeConfigSchema } from '@walkeros/core/dev';
const mockFetchPackage = jest.mocked(fetchPackage);

// The catalog module reaches the app through the CLI's typed client; this
// suite mocks fetchCatalog itself, so the client is never called.
jest.mock('@walkeros/cli', () => ({ apiRequest: jest.fn() }));

jest.mock('../../catalog.js', () => ({
  fetchCatalog: jest.fn(),
  normalizePlatform: jest.requireActual('../../catalog.js').normalizePlatform,
  getPackageBaseUrl: jest.requireActual('../../catalog.js').getPackageBaseUrl,
}));

import { fetchCatalog } from '../../catalog.js';
const mockFetchCatalog = jest.mocked(fetchCatalog);

/** The config the first `registerTool` call passed, narrowed. */
function firstRegisteredConfig(
  calls: readonly unknown[],
): Record<string, unknown> {
  const first = calls[0];
  if (!Array.isArray(first)) throw new Error('No tool was registered');
  return record(first[1]);
}

describe('package_get tool', () => {
  let tool: ToolSpec;

  beforeEach(() => {
    jest.clearAllMocks();
    tool = createPackageGetToolSpec();
  });

  it('should register with correct name', () => {
    expect(tool.name).toBe('package_get');
    // No outputSchema — removed to avoid SDK -32602 crashes on unexpected field values
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    const registerTool = jest.spyOn(server, 'registerTool');
    registerGetPackageSchemaTool(server);
    expect(
      firstRegisteredConfig(registerTool.mock.calls).outputSchema,
    ).toBeUndefined();
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
    const result = await tool.handler({
      package: '@walkeros/web-destination-snowplow',
    });

    expect(mockFetchPackage).toHaveBeenCalledWith(
      '@walkeros/web-destination-snowplow',
      { version: undefined },
    );

    const content = structured(result);
    expect(content.package).toBe('@walkeros/web-destination-snowplow');
    expect(record(content.schemas).config).toBeDefined();
    expect(content.type).toBe('destination');
    expect(content.platform).toEqual(['web']);
  });

  it('should return error when package not found', async () => {
    mockFetchPackage.mockRejectedValue(
      new Error('Package "nonexistent" not found on npm (HTTP 404)'),
    );
    const result = await tool.handler({ package: 'nonexistent' });
    expect(isErrorResult(result)).toBe(true);
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
    const result = await tool.handler({ package: 'pkg', version: '2.0.0' });

    expect(mockFetchPackage).toHaveBeenCalledWith('pkg', {
      version: '2.0.0',
    });
    expect(structured(result).platform).toEqual([]);
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
    const result = await tool.handler({
      package: '@walkeros/server-destination-gcp',
    });

    const content = structured(result);
    expect(content.platform).toEqual(['server']);
    expect(content.hints).toBeDefined();
    const hints = record(content.hints);
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
    const result = await tool.handler({ package: 'pkg', section: 'hints' });

    const content = structured(result);
    expect(content.platform).toEqual(['server']);
    const hints = record(content.hints);
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
    const result = await tool.handler({ package: 'pkg', section: 'examples' });

    const content = structured(result);
    expect(content.platform).toEqual(['web']);
    expect(content.examples).toBeDefined();
    const hints = record(content.hints);
    expect(hints['setup']).toEqual({ text: 'Install SDK first' });
  });

  it.each([
    ['examples', true],
    [undefined, false],
  ])('returns exportExamples for section=%s: %s', async (section, expected) => {
    const exportExamples = {
      destinationBigQuery: { step: {} },
      destinationPubSub: { step: {} },
    };
    mockFetchPackage.mockResolvedValue({
      packageName: '@walkeros/server-destination-gcp',
      version: '1.0.0',
      type: 'destination',
      platform: 'server',
      schemas: {},
      examples: { step: {} },
      exportExamples,
      hintKeys: [],
      exampleSummaries: [],
    });
    const result = await tool.handler({
      package: '@walkeros/server-destination-gcp',
      section,
    });

    expect(structured(result).exportExamples).toEqual(
      expected ? exportExamples : undefined,
    );
  });

  it('returns exportSchemas with a merged config per export', async () => {
    const bigquerySettings = {
      type: 'object',
      properties: { projectId: { type: 'string' } },
    };
    const pubsubSettings = {
      type: 'object',
      properties: { topic: { type: 'string' } },
    };
    const pubsubSetup = { type: 'object', properties: {} };
    mockFetchPackage.mockResolvedValue({
      packageName: '@walkeros/server-destination-gcp',
      version: '1.0.0',
      type: 'destination',
      platform: 'server',
      schemas: { settings: bigquerySettings },
      examples: {},
      exportSchemas: {
        destinationBigQuery: { settings: bigquerySettings },
        destinationPubSub: { settings: pubsubSettings, setup: pubsubSetup },
      },
      exports: {
        destinationBigQuery: 'BigQuery',
        destinationPubSub: 'Pub/Sub',
      },
      hintKeys: [],
      exampleSummaries: [],
    });
    const result = await tool.handler({
      package: '@walkeros/server-destination-gcp',
    });

    expect(structured(result).exportSchemas).toEqual({
      destinationBigQuery: {
        config: mergeConfigSchema('destination', {
          settings: bigquerySettings,
        }),
      },
      destinationPubSub: {
        config: mergeConfigSchema('destination', { settings: pubsubSettings }),
        setup: pubsubSetup,
      },
    });
  });

  it('omits exportSchemas for a single-export package', async () => {
    mockFetchPackage.mockResolvedValue({
      packageName: '@walkeros/web-destination-gtag',
      version: '1.0.0',
      type: 'destination',
      platform: 'web',
      schemas: { settings: { type: 'object', properties: {} } },
      examples: {},
      hintKeys: [],
      exampleSummaries: [],
    });
    const result = await tool.handler({
      package: '@walkeros/web-destination-gtag',
    });

    expect(structured(result).exportSchemas).toBeUndefined();
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
    const result = await tool.handler({ package: 'pkg', section: 'all' });

    const content = structured(result);
    expect(content.platform).toEqual(['web']);
    expect(content.schemas).toBeDefined();
    expect(content.examples).toBeDefined();
    expect(content.hints).toBeDefined();
    const hints = record(content.hints);
    expect(record(hints['a']).code).toBeDefined();
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
    const result = await tool.handler({
      package: '@walkeros/web-source-browser',
    });

    const schemas = record(structured(result).schemas);

    // config key exists with merged schema
    expect(schemas.config).toBeDefined();
    const config = record(schemas.config);
    const props = record(config.properties);

    // Base source fields present
    expect(props.consent).toBeDefined();
    expect(props.require).toBeDefined();
    expect(props.logger).toBeDefined();

    // Package settings merged in
    const settings = record(props.settings);
    expect(record(settings.properties).pageview).toBeDefined();

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
    const result = await tool.handler({
      package: '@walkeros/web-destination-api',
    });

    const schemas = record(structured(result).schemas);
    const config = record(schemas.config);
    const props = record(config.properties);

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
    const result = await tool.handler({
      package: '@walkeros/web-destination-gtag',
    });

    const schemas = record(structured(result).schemas);

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
  let tool: ToolSpec;

  beforeEach(() => {
    jest.clearAllMocks();
    tool = createPackageSearchToolSpec();
  });

  it('should register with correct name', () => {
    expect(tool.name).toBe('package_search');
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
    const result = await tool.handler({
      package: '@walkeros/web-destination-snowplow',
    });

    expect(mockFetchPackage).toHaveBeenCalledWith(
      '@walkeros/web-destination-snowplow',
      { version: undefined },
    );

    const content = structured(result);
    expect(content.package).toBe('@walkeros/web-destination-snowplow');
    expect(content.version).toBe('0.0.12');
    expect(content.description).toBe('Snowplow destination for walkerOS');
    expect(content.platform).toEqual(['web']);
  });

  it('should return error when package not found', async () => {
    mockFetchPackage.mockRejectedValue(
      new Error('Package "nonexistent" not found on npm (HTTP 404)'),
    );
    const result = await tool.handler({ package: 'nonexistent' });
    expect(isErrorResult(result)).toBe(true);
  });

  it('should return catalog in browse mode', async () => {
    const mockCatalog = [
      {
        name: '@walkeros/web-destination-gtag',
        version: '1.0.0',
        type: 'destination',
        platform: ['web'],
        description: 'GA4',
      },
    ];
    mockFetchCatalog.mockResolvedValue({ entries: mockCatalog, warnings: [] });
    const result = await tool.handler({});

    expect(mockFetchPackage).not.toHaveBeenCalled();
    expect(mockFetchCatalog).toHaveBeenCalledWith({
      type: undefined,
      platform: undefined,
    });
    expect(structured(result).catalog).toEqual(mockCatalog);
    expect(structured(result).count).toBe(1);
  });

  it('should surface catalog warnings in browse output hints', async () => {
    mockFetchCatalog.mockResolvedValue({
      entries: [],
      warnings: [
        'app catalog endpoint unavailable, fell back to npm; results may be incomplete',
      ],
    });
    const result = await tool.handler({});

    const hints = record(structured(result)._hints);
    expect(hints.warnings).toEqual([
      'app catalog endpoint unavailable, fell back to npm; results may be incomplete',
    ]);
  });

  it('should omit warnings hint when catalog returns none', async () => {
    mockFetchCatalog.mockResolvedValue({ entries: [], warnings: [] });
    const result = await tool.handler({});

    const hints = record(structured(result)._hints);
    expect(hints.warnings).toBeUndefined();
  });

  it('should pass type filter to catalog', async () => {
    mockFetchCatalog.mockResolvedValue({ entries: [], warnings: [] });
    await tool.handler({ type: 'destination' });

    expect(mockFetchCatalog).toHaveBeenCalledWith({
      type: 'destination',
      platform: undefined,
    });
  });

  it('should pass platform filter to catalog', async () => {
    mockFetchCatalog.mockResolvedValue({ entries: [], warnings: [] });
    await tool.handler({ platform: 'web' });

    expect(mockFetchCatalog).toHaveBeenCalledWith({
      type: undefined,
      platform: 'web',
    });
  });

  it('should pass combined filters to catalog', async () => {
    mockFetchCatalog.mockResolvedValue({ entries: [], warnings: [] });
    await tool.handler({ type: 'source', platform: 'server' });

    expect(mockFetchCatalog).toHaveBeenCalledWith({
      type: 'source',
      platform: 'server',
    });
  });
});
