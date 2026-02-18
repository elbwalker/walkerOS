const mockListFlows = jest.fn();
const mockGetFlow = jest.fn();

jest.mock('@walkeros/cli', () => ({
  listFlows: mockListFlows,
  getFlow: mockGetFlow,
}));

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

describe('flows resource', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(async () => {
    jest.clearAllMocks();
    server = createMockServer();
    const { registerFlowResources } = await import('../../resources/flows.js');
    registerFlowResources(server as any);
  });

  it('should register with correct name and metadata', () => {
    const resource = server.getResource('flow-config');
    expect(resource).toBeDefined();
    expect((resource.config as any).title).toBe('walkerOS Flow Configuration');
    expect((resource.config as any).mimeType).toBe('application/json');
  });

  it('should have a ResourceTemplate with URI pattern', () => {
    const resource = server.getResource('flow-config');
    expect(resource.template).toBeDefined();
    expect(resource.template.constructor.name).toBe('ResourceTemplate');
  });

  it('should list flows from API', async () => {
    mockListFlows.mockResolvedValue({
      flows: [
        { id: 'cfg_1', name: 'Production' },
        { id: 'cfg_2', name: 'Staging' },
      ],
      total: 2,
    });

    const resource = server.getResource('flow-config');
    const listCallback = (resource.template as any).listCallback;
    const result = await listCallback({});

    expect(result.resources).toHaveLength(2);
    expect(result.resources[0].uri).toBe('walkeros://flow/cfg_1');
    expect(result.resources[0].name).toBe('Production');
  });

  it('should return empty list when not authenticated', async () => {
    mockListFlows.mockRejectedValue(new Error('WALKEROS_TOKEN not set'));

    const resource = server.getResource('flow-config');
    const listCallback = (resource.template as any).listCallback;
    const result = await listCallback({});

    expect(result.resources).toEqual([]);
  });

  it('should read a flow by ID', async () => {
    const flowData = {
      id: 'cfg_1',
      name: 'Production',
      content: { version: 1, flows: {} },
    };
    mockGetFlow.mockResolvedValue(flowData);

    const resource = server.getResource('flow-config');
    const uri = new URL('walkeros://flow/cfg_1');
    const result = await resource.readCallback(uri, { flowId: 'cfg_1' }, {});

    expect(mockGetFlow).toHaveBeenCalledWith({ flowId: 'cfg_1' });
    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].mimeType).toBe('application/json');
    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.id).toBe('cfg_1');
  });
});
