import { registerPackageSchemaResources } from '../../resources/package-schemas.js';
import { fetchPackageSchema } from '@walkeros/core';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { record, str } from '../support/tool-result.js';

jest.mock('@walkeros/core', () => ({
  fetchPackageSchema: jest.fn(),
}));

jest.mock('../../catalog.js', () => ({
  fetchCatalog: jest.fn().mockResolvedValue({
    entries: [
      {
        name: '@walkeros/test-pkg',
        version: '1.0.0',
        type: 'destination',
        platform: ['web'],
        description: 'Test package',
      },
    ],
    warnings: [],
  }),
  getPackageBaseUrl: jest.fn(() => undefined),
}));

const mockFetchPackageSchema = jest.mocked(fetchPackageSchema);

/** The callback context the SDK hands a resource; these callbacks ignore it. */
const extra: RequestHandlerExtra<ServerRequest, ServerNotification> = {
  signal: new AbortController().signal,
  requestId: 1,
  sendNotification: async () => {},
  sendRequest: async () => {
    throw new Error('not used by resource callbacks');
  },
};

/**
 * Register against a real McpServer and capture what was passed to
 * `registerResource`, so the test reads the template, config and read
 * callback exactly as the production code handed them over.
 */
function createServer() {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  const spy = jest.spyOn(server, 'registerResource');
  return {
    server,
    getResource(name: string) {
      const call = spy.mock.calls.find(([registered]) => registered === name);
      if (!call) throw new Error(`Resource ${name} not registered`);
      const [, template, config, readCallback] = call;
      return { template, config, readCallback };
    },
  };
}

describe('package-schemas resource', () => {
  let server: ReturnType<typeof createServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createServer();
    registerPackageSchemaResources(server.server);
  });

  it('should register with correct name and metadata', () => {
    const resource = server.getResource('package-schema');
    expect(resource).toBeDefined();
    expect(resource.config.title).toBe('walkerOS Package Schema');
    expect(resource.config.mimeType).toBe('application/json');
  });

  it('should have a ResourceTemplate with URI pattern', () => {
    const resource = server.getResource('package-schema');
    expect(resource.template).toBeDefined();
    const template = resource.template;
    expect(
      template && typeof template === 'object'
        ? template.constructor.name
        : null,
    ).toBe('ResourceTemplate');
  });

  it('should list known walkerOS packages', async () => {
    const resource = server.getResource('package-schema');
    const listCallback = resource.template.listCallback;
    expect(listCallback).toBeDefined();
    if (!listCallback) return;

    const result = await listCallback(extra);
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0]).toHaveProperty('uri');
    expect(result.resources[0]).toHaveProperty('name', '@walkeros/test-pkg');
    expect(result.resources[0]).toHaveProperty('mimeType', 'application/json');
  });

  it('should read a package schema', async () => {
    mockFetchPackageSchema.mockResolvedValue({
      packageName: '@walkeros/web-destination-google-ga4',
      version: '0.2.0',
      type: 'destination',
      platform: 'web',
      schemas: { settings: { type: 'object' } },
      examples: { mapping: {} },
    });

    const resource = server.getResource('package-schema');
    const uri = new URL(
      'walkeros://schema/%40walkeros%2Fweb-destination-google-ga4',
    );
    const variables = {
      packageName: '%40walkeros%2Fweb-destination-google-ga4',
    };
    const result = await resource.readCallback(uri, variables, extra);

    expect(mockFetchPackageSchema).toHaveBeenCalledWith(
      '@walkeros/web-destination-google-ga4',
    );
    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].mimeType).toBe('application/json');
    const parsed: unknown = JSON.parse(str(record(result.contents[0]).text));
    expect(record(parsed).packageName).toBe(
      '@walkeros/web-destination-google-ga4',
    );
  });
});
