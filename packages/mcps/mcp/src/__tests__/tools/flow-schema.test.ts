import { registerReferenceResources } from '../../resources/references.js';

jest.mock('../../catalog.js', () => ({
  fetchCatalog: jest.fn().mockResolvedValue([
    {
      name: '@walkeros/test-pkg',
      version: '1.0.0',
      type: 'destination',
      platform: ['web'],
      description: 'Test package',
    },
  ]),
}));

function createMockServer() {
  const resources: Record<string, { metadata: unknown; handler: Function }> =
    {};
  return {
    resource(name: string, uri: string, metadata: unknown, handler: Function) {
      resources[name] = { metadata, handler };
    },
    getResource(name: string) {
      return resources[name];
    },
  };
}

describe('reference resources', () => {
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockServer = createMockServer();
    registerReferenceResources(mockServer as any);
  });

  describe('flow-schema', () => {
    it('should register flow-schema resource', () => {
      expect(mockServer.getResource('flow-schema')).toBeDefined();
    });

    it('should return a valid JSON Schema with config properties', async () => {
      const resource = mockServer.getResource('flow-schema');
      const result = await resource.handler();
      const parsed = JSON.parse(result.contents[0].text);

      expect(parsed.$schema).toBe('http://json-schema.org/draft-07/schema#');
      expect(parsed.type).toBe('object');
      expect(parsed.properties).toBeDefined();
      expect(parsed.properties.version).toBeDefined();
      expect(parsed.properties.flows).toBeDefined();
      expect(parsed.properties.variables).toBeDefined();
      expect(parsed.properties.contract).toBeDefined();
      // Descriptions auto-generated from Zod .describe()
      expect(parsed.properties.flows.description).toBeDefined();
    });
  });

  describe('event-model', () => {
    it('should return a valid JSON Schema for events', async () => {
      const resource = mockServer.getResource('event-model');
      const result = await resource.handler();
      const parsed = JSON.parse(result.contents[0].text);

      expect(parsed.$schema).toBe('http://json-schema.org/draft-07/schema#');
      expect(parsed.properties.name).toBeDefined();
      expect(parsed.properties.data).toBeDefined();
      expect(parsed.properties.entity).toBeDefined();
      expect(parsed.properties.action).toBeDefined();
    });
  });

  describe('mapping', () => {
    it('should return JSON Schemas for mapping components', async () => {
      const resource = mockServer.getResource('mapping');
      const result = await resource.handler();
      const parsed = JSON.parse(result.contents[0].text);

      expect(parsed.rules).toBeDefined();
      expect(parsed.rules.$schema).toBe(
        'http://json-schema.org/draft-07/schema#',
      );
      expect(parsed.valueConfig).toBeDefined();
      expect(parsed.rule).toBeDefined();
      expect(parsed.policy).toBeDefined();
    });
  });

  describe('contract', () => {
    it('should return a valid JSON Schema', async () => {
      const resource = mockServer.getResource('contract');
      const result = await resource.handler();
      const parsed = JSON.parse(result.contents[0].text);

      expect(parsed.$schema).toBe('http://json-schema.org/draft-07/schema#');
    });
  });

  describe('consent', () => {
    it('should return a valid JSON Schema', async () => {
      const resource = mockServer.getResource('consent');
      const result = await resource.handler();
      const parsed = JSON.parse(result.contents[0].text);

      expect(parsed.$schema).toBe('http://json-schema.org/draft-07/schema#');
    });
  });

  describe('variables', () => {
    it('should return interpolation pattern reference (hand-maintained)', async () => {
      const resource = mockServer.getResource('variables');
      const result = await resource.handler();
      const parsed = JSON.parse(result.contents[0].text);

      expect(parsed.patterns).toBeDefined();
      expect(parsed.patterns['$var.name']).toBeDefined();
      expect(parsed.patterns['$env.NAME']).toBeDefined();
      expect(parsed.patterns['$code:(expr)']).toBeDefined();
      expect(parsed.patterns['$store:storeId']).toBeDefined();
    });
  });

  describe('examples', () => {
    it('should register examples resource', () => {
      expect(mockServer.getResource('examples')).toBeDefined();
    });

    it('should return a valid flow config from real file', async () => {
      const resource = mockServer.getResource('examples');
      const result = await resource.handler();
      const parsed = JSON.parse(result.contents[0].text);

      expect(parsed.version).toBe(3);
      expect(parsed.flows).toBeDefined();
    });
  });

  describe('already-automated resources', () => {
    it('should register openapi resource', () => {
      expect(mockServer.getResource('openapi')).toBeDefined();
    });

    it('should register packages resource', () => {
      expect(mockServer.getResource('packages')).toBeDefined();
    });

    it('packages resource returns catalog entries', async () => {
      const resource = mockServer.getResource('packages');
      const result = await resource.handler();
      const parsed = JSON.parse(result.contents[0].text);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('@walkeros/test-pkg');
    });
  });
});
