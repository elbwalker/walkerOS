import { registerReferenceResources } from '../../resources/references.js';

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

describe('flow-schema reference resource', () => {
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockServer = createMockServer();
    registerReferenceResources(mockServer as any);
  });

  it('should register flow-schema resource', () => {
    const resource = mockServer.getResource('flow-schema');
    expect(resource).toBeDefined();
  });

  it('should return structure, connectionRules, and minimalExample', async () => {
    const resource = mockServer.getResource('flow-schema');
    const result = await resource.handler();

    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.structure).toBeDefined();
    expect(parsed.structure.version).toBeDefined();
    expect(parsed.structure.flows).toBeDefined();
    expect(parsed.connectionRules).toBeDefined();
    expect(Array.isArray(parsed.connectionRules)).toBe(true);
    expect(parsed.connectionRules.length).toBeGreaterThan(0);
    expect(parsed.minimalExample).toBeDefined();
    expect(parsed.minimalExample.version).toBe(1);
    expect(parsed.minimalExample.flows.default).toBeDefined();
  });

  it('should include platform options', async () => {
    const resource = mockServer.getResource('flow-schema');
    const result = await resource.handler();

    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.platformOptions).toBeDefined();
    expect(parsed.platformOptions.web).toBeDefined();
    expect(parsed.platformOptions.server).toBeDefined();
  });
});

describe('reference resources catalog', () => {
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockServer = createMockServer();
    registerReferenceResources(mockServer as any);
  });

  it('should register event-model resource', () => {
    expect(mockServer.getResource('event-model')).toBeDefined();
  });

  it('should register mapping resource', () => {
    expect(mockServer.getResource('mapping')).toBeDefined();
  });

  it('should register consent resource', () => {
    expect(mockServer.getResource('consent')).toBeDefined();
  });

  it('should register variables resource', () => {
    expect(mockServer.getResource('variables')).toBeDefined();
  });

  it('should register contract resource', () => {
    expect(mockServer.getResource('contract')).toBeDefined();
  });

  it('should register api resource', () => {
    expect(mockServer.getResource('api')).toBeDefined();
  });

  it('should register packages resource', () => {
    expect(mockServer.getResource('packages')).toBeDefined();
  });

  it('event-model resource returns valid JSON', async () => {
    const resource = mockServer.getResource('event-model');
    const result = await resource.handler();
    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.naming).toBeDefined();
    expect(parsed.properties).toBeDefined();
    expect(parsed.properties.data).toBeDefined();
  });

  it('packages resource returns registry entries', async () => {
    const resource = mockServer.getResource('packages');
    const result = await resource.handler();
    const parsed = JSON.parse(result.contents[0].text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0].name).toBeDefined();
    expect(parsed[0].type).toBeDefined();
  });
});
