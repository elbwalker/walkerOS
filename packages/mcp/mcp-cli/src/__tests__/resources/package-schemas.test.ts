import { registerPackageSchemaResources } from '../../resources/package-schemas.js';
import { fetchPackageSchema } from '@walkeros/core';

jest.mock('@walkeros/core', () => ({
  fetchPackageSchema: jest.fn(),
}));

const mockFetchPackageSchema = fetchPackageSchema as jest.MockedFunction<
  typeof fetchPackageSchema
>;

function createMockServer() {
  const resources: Record<
    string,
    { template: unknown; config: unknown; readCallback: Function }
  > = {};
  return {
    registerResource(
      name: string,
      template: unknown,
      config: unknown,
      readCallback: Function,
    ) {
      resources[name] = { template, config, readCallback };
    },
    getResource(name: string) {
      return resources[name];
    },
  };
}

describe('package-schemas resource', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
    registerPackageSchemaResources(server as any);
  });

  it('should register with correct name and metadata', () => {
    const resource = server.getResource('package-schema');
    expect(resource).toBeDefined();
    expect((resource.config as any).title).toBe('walkerOS Package Schema');
    expect((resource.config as any).mimeType).toBe('application/json');
  });

  it('should have a ResourceTemplate with URI pattern', () => {
    const resource = server.getResource('package-schema');
    expect(resource.template).toBeDefined();
    expect(resource.template.constructor.name).toBe('ResourceTemplate');
  });

  it('should list known walkerOS packages', async () => {
    const resource = server.getResource('package-schema');
    const listCallback = (resource.template as any).listCallback;
    expect(listCallback).toBeDefined();

    const result = await listCallback({});
    expect(result.resources.length).toBeGreaterThan(0);
    expect(result.resources[0]).toHaveProperty('uri');
    expect(result.resources[0]).toHaveProperty('name');
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
    const result = await resource.readCallback(uri, variables, {});

    expect(mockFetchPackageSchema).toHaveBeenCalledWith(
      '@walkeros/web-destination-google-ga4',
    );
    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].mimeType).toBe('application/json');
    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.packageName).toBe('@walkeros/web-destination-google-ga4');
  });
});
