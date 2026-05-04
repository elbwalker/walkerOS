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

/**
 * Zod v4's `toJSONSchema` wraps the root in `allOf: [{ $ref: '#/definitions/X' }]`
 * with the actual object schema under `definitions.X`. This helper returns the
 * concrete root definition so tests can assert on `type` / `properties`.
 */
type AnyObj = Record<string, unknown>;
function resolveRoot(parsed: AnyObj): AnyObj {
  const allOf = parsed.allOf as AnyObj[] | undefined;
  const ref = allOf?.[0]?.$ref as string | undefined;
  const defs = parsed.definitions as Record<string, AnyObj> | undefined;
  if (!ref || !defs) return parsed;
  const name = ref.replace('#/definitions/', '');
  return defs[name] ?? parsed;
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
      const root = resolveRoot(parsed);
      const props = root.properties as Record<string, AnyObj> | undefined;

      expect(parsed.$schema).toBe('http://json-schema.org/draft-07/schema#');
      expect(root.type).toBe('object');
      expect(props).toBeDefined();
      expect(props!.version).toBeDefined();
      expect(props!.flows).toBeDefined();
      expect(props!.variables).toBeDefined();
      expect(props!.contract).toBeDefined();
      // Descriptions auto-generated from Zod .describe()
      expect(props!.flows.description).toBeDefined();
    });
  });

  describe('event-model', () => {
    it('should return a valid JSON Schema for events', async () => {
      const resource = mockServer.getResource('event-model');
      const result = await resource.handler();
      const parsed = JSON.parse(result.contents[0].text);
      const root = resolveRoot(parsed);
      const props = root.properties as Record<string, AnyObj> | undefined;

      expect(parsed.$schema).toBe('http://json-schema.org/draft-07/schema#');
      expect(props).toBeDefined();
      expect(props!.name).toBeDefined();
      expect(props!.data).toBeDefined();
      expect(props!.entity).toBeDefined();
      expect(props!.action).toBeDefined();
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
      expect(parsed.patterns['$store.storeId']).toBeDefined();
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

      expect(parsed.version).toBe(4);
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
