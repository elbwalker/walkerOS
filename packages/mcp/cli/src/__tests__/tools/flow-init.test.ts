import { registerFlowInitTool } from '../../tools/flow-init.js';
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

describe('flow_init tool', () => {
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockServer = createMockServer();
    registerFlowInitTool(mockServer as any);
  });

  it('should register with correct name', () => {
    const tool = mockServer.getTool('flow_init');
    expect(tool).toBeDefined();
    expect((tool.config as any).title).toBe('Initialize Flow');
  });

  it('should generate web flow with default source', async () => {
    mockFetchPackage.mockResolvedValue({
      packageName: '@walkeros/web-destination-gtag',
      version: '2.1.1',
      description: undefined,
      type: 'destination',
      platform: 'web',
      schemas: {
        settings: {
          type: 'object',
          required: ['measurementId'],
          properties: { measurementId: { type: 'string' } },
        },
      },
      examples: {},
      hintKeys: [],
      exampleSummaries: [],
    });

    const tool = mockServer.getTool('flow_init');
    const result = await tool.handler({
      platform: 'web',
      destinations: ['@walkeros/web-destination-gtag'],
    });

    expect(result.content[0].text).toContain('Generated flow');
    const flow = JSON.parse(result.content[1].text);
    expect(flow.version).toBe(1);
    expect(flow.flows.default.web).toEqual({});
    expect(flow.flows.default.packages['@walkeros/web-source-browser']).toEqual(
      {},
    );
    expect(flow.flows.default.sources.browser.package).toBe(
      '@walkeros/web-source-browser',
    );
    expect(flow.flows.default.destinations.gtag.package).toBe(
      '@walkeros/web-destination-gtag',
    );
    expect(flow.flows.default.destinations.gtag.config.measurementId).toBe(
      'YOUR_MEASUREMENTID',
    );
  });

  it('should generate server flow with express source by default', async () => {
    mockFetchPackage.mockResolvedValue({
      packageName: '@walkeros/server-destination-gcp',
      version: '2.1.1',
      description: undefined,
      type: 'destination',
      platform: 'server',
      schemas: { settings: {} },
      examples: {},
      hintKeys: [],
      exampleSummaries: [],
    });

    const tool = mockServer.getTool('flow_init');
    const result = await tool.handler({
      platform: 'server',
      destinations: ['@walkeros/server-destination-gcp'],
    });

    const flow = JSON.parse(result.content[1].text);
    expect(flow.flows.default.server).toEqual({});
    expect(
      flow.flows.default.packages['@walkeros/server-source-express'],
    ).toEqual({});
    expect(flow.flows.default.sources.express.package).toBe(
      '@walkeros/server-source-express',
    );
    expect(flow.flows.default.sources.express.config).toEqual({
      port: 8080,
      status: true,
    });
  });

  it('should use custom sources when specified', async () => {
    mockFetchPackage.mockResolvedValue({
      packageName: '@walkeros/web-destination-gtag',
      version: '2.1.1',
      description: undefined,
      type: 'destination',
      platform: 'web',
      schemas: { settings: {} },
      examples: {},
      hintKeys: [],
      exampleSummaries: [],
    });

    const tool = mockServer.getTool('flow_init');
    const result = await tool.handler({
      platform: 'web',
      destinations: ['@walkeros/web-destination-gtag'],
      sources: ['@walkeros/web-source-datalayer'],
    });

    const flow = JSON.parse(result.content[1].text);
    expect(flow.flows.default.sources.datalayer).toBeDefined();
    expect(flow.flows.default.sources.datalayer.package).toBe(
      '@walkeros/web-source-datalayer',
    );
    // Default source should not be present
    expect(flow.flows.default.sources.browser).toBeUndefined();
  });

  it('should handle multiple destinations', async () => {
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

    const tool = mockServer.getTool('flow_init');
    const result = await tool.handler({
      platform: 'web',
      destinations: [
        '@walkeros/web-destination-gtag',
        '@walkeros/web-destination-meta',
      ],
    });

    const flow = JSON.parse(result.content[1].text);
    expect(flow.flows.default.destinations.gtag).toBeDefined();
    expect(flow.flows.default.destinations.meta).toBeDefined();
    expect(
      flow.flows.default.packages['@walkeros/web-destination-gtag'],
    ).toEqual({});
    expect(
      flow.flows.default.packages['@walkeros/web-destination-meta'],
    ).toEqual({});
  });

  it('should use custom flow name', async () => {
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

    const tool = mockServer.getTool('flow_init');
    const result = await tool.handler({
      platform: 'web',
      destinations: ['@walkeros/web-destination-gtag'],
      flowName: 'marketing',
    });

    const flow = JSON.parse(result.content[1].text);
    expect(flow.flows.marketing).toBeDefined();
    expect(flow.flows.default).toBeUndefined();
  });

  it('should handle unknown package gracefully', async () => {
    mockFetchPackage.mockRejectedValue(new Error('Not found'));

    const tool = mockServer.getTool('flow_init');
    const result = await tool.handler({
      platform: 'web',
      destinations: ['@walkeros/unknown-destination'],
    });

    // Should still generate a skeleton
    const flow = JSON.parse(result.content[1].text);
    expect(flow.flows.default.destinations.destination).toBeDefined();
    expect(flow.flows.default.destinations.destination.package).toBe(
      '@walkeros/unknown-destination',
    );
    expect(flow.flows.default.destinations.destination.config).toEqual({});
  });
});
