const mockListFlows = jest.fn();
const mockGetFlow = jest.fn();
const mockCreateFlow = jest.fn();
const mockUpdateFlow = jest.fn();
const mockDeleteFlow = jest.fn();
const mockDuplicateFlow = jest.fn();

jest.mock('@walkeros/cli', () => ({
  listFlows: mockListFlows,
  getFlow: mockGetFlow,
  createFlow: mockCreateFlow,
  updateFlow: mockUpdateFlow,
  deleteFlow: mockDeleteFlow,
  duplicateFlow: mockDuplicateFlow,
}));

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

describe('flow tools', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(async () => {
    server = createMockServer();
    const { registerFlowTools } = await import('../../tools/flows.js');
    registerFlowTools(server as any);
  });

  afterEach(() => jest.clearAllMocks());

  it('should register all 6 flow tools', () => {
    expect(server.getTool('list-flows')).toBeDefined();
    expect(server.getTool('get-flow')).toBeDefined();
    expect(server.getTool('create-flow')).toBeDefined();
    expect(server.getTool('update-flow')).toBeDefined();
    expect(server.getTool('delete-flow')).toBeDefined();
    expect(server.getTool('duplicate-flow')).toBeDefined();
  });

  describe('list-flows', () => {
    it('should pass options to listFlows()', async () => {
      mockListFlows.mockResolvedValue({ flows: [] });
      await server.getTool('list-flows').handler({ projectId: 'proj_1' });
      expect(mockListFlows).toHaveBeenCalledWith({
        projectId: 'proj_1',
        sort: undefined,
        order: undefined,
        includeDeleted: undefined,
      });
    });

    it('should pass query params', async () => {
      mockListFlows.mockResolvedValue({ flows: [] });
      await server.getTool('list-flows').handler({
        projectId: 'proj_1',
        sort: 'name',
        order: 'asc',
        includeDeleted: true,
      });
      expect(mockListFlows).toHaveBeenCalledWith({
        projectId: 'proj_1',
        sort: 'name',
        order: 'asc',
        includeDeleted: true,
      });
    });
  });

  describe('get-flow', () => {
    it('should pass flowId and projectId to getFlow()', async () => {
      mockGetFlow.mockResolvedValue({ id: 'cfg_abc' });
      await server
        .getTool('get-flow')
        .handler({ flowId: 'cfg_abc', projectId: 'proj_1' });
      expect(mockGetFlow).toHaveBeenCalledWith({
        flowId: 'cfg_abc',
        projectId: 'proj_1',
      });
    });
  });

  describe('create-flow', () => {
    it('should pass name, content, projectId to createFlow()', async () => {
      mockCreateFlow.mockResolvedValue({ id: 'cfg_new' });
      const content = { version: 1 };
      await server
        .getTool('create-flow')
        .handler({ name: 'My Flow', content, projectId: 'proj_1' });
      expect(mockCreateFlow).toHaveBeenCalledWith({
        name: 'My Flow',
        content,
        projectId: 'proj_1',
      });
    });
  });

  describe('update-flow', () => {
    it('should pass all fields to updateFlow()', async () => {
      mockUpdateFlow.mockResolvedValue({ id: 'cfg_abc' });
      const content = { version: 1, sources: [] };
      await server.getTool('update-flow').handler({
        flowId: 'cfg_abc',
        name: 'Updated',
        content,
        projectId: 'proj_1',
      });
      expect(mockUpdateFlow).toHaveBeenCalledWith({
        flowId: 'cfg_abc',
        name: 'Updated',
        content,
        projectId: 'proj_1',
      });
    });
  });

  describe('delete-flow', () => {
    it('should pass flowId and projectId to deleteFlow()', async () => {
      mockDeleteFlow.mockResolvedValue({ success: true });
      const tool = server.getTool('delete-flow');
      expect((tool.config as any).annotations.destructiveHint).toBe(true);
      await tool.handler({ flowId: 'cfg_abc', projectId: 'proj_1' });
      expect(mockDeleteFlow).toHaveBeenCalledWith({
        flowId: 'cfg_abc',
        projectId: 'proj_1',
      });
    });
  });

  describe('duplicate-flow', () => {
    it('should pass flowId, name, projectId to duplicateFlow()', async () => {
      mockDuplicateFlow.mockResolvedValue({ id: 'cfg_copy' });
      await server.getTool('duplicate-flow').handler({
        flowId: 'cfg_abc',
        name: 'My Copy',
        projectId: 'proj_1',
      });
      expect(mockDuplicateFlow).toHaveBeenCalledWith({
        flowId: 'cfg_abc',
        name: 'My Copy',
        projectId: 'proj_1',
      });
    });

    it('should pass undefined name when not provided', async () => {
      mockDuplicateFlow.mockResolvedValue({ id: 'cfg_copy' });
      await server
        .getTool('duplicate-flow')
        .handler({ flowId: 'cfg_abc', projectId: 'proj_1' });
      expect(mockDuplicateFlow).toHaveBeenCalledWith({
        flowId: 'cfg_abc',
        name: undefined,
        projectId: 'proj_1',
      });
    });
  });
});
