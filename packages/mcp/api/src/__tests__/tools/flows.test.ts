import {
  ListFlowsOutputShape,
  FlowOutputShape,
  FlowWriteOutputShape,
  DeleteOutputShape,
} from '../../schemas/output.js';

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
    expect(server.getTool('flow_list')).toBeDefined();
    expect(server.getTool('flow_get')).toBeDefined();
    expect(server.getTool('flow_create')).toBeDefined();
    expect(server.getTool('flow_update')).toBeDefined();
    expect(server.getTool('flow_delete')).toBeDefined();
    expect(server.getTool('flow_duplicate')).toBeDefined();
  });

  it('has outputSchema on all tools', () => {
    const keys = (name: string) =>
      Object.keys((server.getTool(name).config as any).outputSchema ?? {});

    expect(keys('flow_list')).toEqual(Object.keys(ListFlowsOutputShape));
    expect(keys('flow_get')).toEqual(Object.keys(FlowOutputShape));
    expect(keys('flow_create')).toEqual(Object.keys(FlowWriteOutputShape));
    expect(keys('flow_update')).toEqual(Object.keys(FlowWriteOutputShape));
    expect(keys('flow_delete')).toEqual(Object.keys(DeleteOutputShape));
    expect(keys('flow_duplicate')).toEqual(Object.keys(FlowWriteOutputShape));
  });

  describe('flow_list', () => {
    it('should pass options to listFlows() and return structuredContent', async () => {
      const mockResponse = { flows: [] };
      mockListFlows.mockResolvedValue(mockResponse);
      const result = await server
        .getTool('flow_list')
        .handler({ projectId: 'proj_1' });
      expect(mockListFlows).toHaveBeenCalledWith({
        projectId: 'proj_1',
        sort: undefined,
        order: undefined,
        includeDeleted: undefined,
      });
      expect(result.structuredContent).toEqual(mockResponse);
    });

    it('should pass query params', async () => {
      mockListFlows.mockResolvedValue({ flows: [] });
      await server.getTool('flow_list').handler({
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

  describe('flow_get', () => {
    it('should pass flowId and projectId to getFlow()', async () => {
      mockGetFlow.mockResolvedValue({ id: 'cfg_abc' });
      await server
        .getTool('flow_get')
        .handler({ flowId: 'cfg_abc', projectId: 'proj_1' });
      expect(mockGetFlow).toHaveBeenCalledWith({
        flowId: 'cfg_abc',
        projectId: 'proj_1',
        fields: undefined,
      });
    });

    it('should pass fields to getFlow()', async () => {
      mockGetFlow.mockResolvedValue({
        id: 'cfg_abc',
        content: { variables: {} },
      });
      await server.getTool('flow_get').handler({
        flowId: 'cfg_abc',
        projectId: 'proj_1',
        fields: ['content.variables'],
      });
      expect(mockGetFlow).toHaveBeenCalledWith({
        flowId: 'cfg_abc',
        projectId: 'proj_1',
        fields: ['content.variables'],
      });
    });
  });

  describe('flow_create', () => {
    it('should pass name, content, projectId to createFlow()', async () => {
      mockCreateFlow.mockResolvedValue({
        id: 'cfg_new',
        name: 'My Flow',
        content: { version: 2 },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });
      const content = { version: 1 };
      await server
        .getTool('flow_create')
        .handler({ name: 'My Flow', content, projectId: 'proj_1' });
      expect(mockCreateFlow).toHaveBeenCalledWith({
        name: 'My Flow',
        content,
        projectId: 'proj_1',
      });
    });

    it('strips content from result (write optimization)', async () => {
      mockCreateFlow.mockResolvedValue({
        id: 'cfg_new',
        name: 'My Flow',
        content: { version: 2, flows: { web: {} } },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });
      const result = await server
        .getTool('flow_create')
        .handler({ name: 'My Flow', content: {}, projectId: 'proj_1' });
      expect(result.structuredContent).toEqual({
        id: 'cfg_new',
        name: 'My Flow',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });
      expect(result.structuredContent.content).toBeUndefined();
    });
  });

  describe('flow_update', () => {
    it('should have idempotentHint true', () => {
      const tool = server.getTool('flow_update');
      expect((tool.config as any).annotations.idempotentHint).toBe(true);
    });

    it('should pass mergePatch:true by default', async () => {
      mockUpdateFlow.mockResolvedValue({
        id: 'cfg_abc',
        name: 'Updated',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });
      await server.getTool('flow_update').handler({
        flowId: 'cfg_abc',
        name: 'Updated',
        projectId: 'proj_1',
      });
      expect(mockUpdateFlow).toHaveBeenCalledWith({
        flowId: 'cfg_abc',
        name: 'Updated',
        content: undefined,
        projectId: 'proj_1',
        mergePatch: true,
      });
    });

    it('should pass mergePatch:false when patch is false', async () => {
      mockUpdateFlow.mockResolvedValue({
        id: 'cfg_abc',
        name: 'Updated',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });
      const content = { version: 2, flows: {} };
      await server.getTool('flow_update').handler({
        flowId: 'cfg_abc',
        content,
        patch: false,
        projectId: 'proj_1',
      });
      expect(mockUpdateFlow).toHaveBeenCalledWith({
        flowId: 'cfg_abc',
        name: undefined,
        content,
        projectId: 'proj_1',
        mergePatch: false,
      });
    });

    it('strips content from result (write optimization)', async () => {
      mockUpdateFlow.mockResolvedValue({
        id: 'cfg_abc',
        name: 'Updated',
        content: { version: 2, flows: { web: {} } },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });
      const result = await server.getTool('flow_update').handler({
        flowId: 'cfg_abc',
        name: 'Updated',
        projectId: 'proj_1',
      });
      expect(result.structuredContent.content).toBeUndefined();
    });
  });

  describe('flow_delete', () => {
    it('should have idempotentHint true', () => {
      const tool = server.getTool('flow_delete');
      expect((tool.config as any).annotations.idempotentHint).toBe(true);
    });

    it('should pass flowId and projectId to deleteFlow()', async () => {
      mockDeleteFlow.mockResolvedValue({ success: true });
      const tool = server.getTool('flow_delete');
      expect((tool.config as any).annotations.destructiveHint).toBe(true);
      await tool.handler({ flowId: 'cfg_abc', projectId: 'proj_1' });
      expect(mockDeleteFlow).toHaveBeenCalledWith({
        flowId: 'cfg_abc',
        projectId: 'proj_1',
      });
    });
  });

  describe('flow_duplicate', () => {
    it('should pass flowId, name, projectId to duplicateFlow()', async () => {
      mockDuplicateFlow.mockResolvedValue({
        id: 'cfg_copy',
        name: 'My Copy',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });
      await server.getTool('flow_duplicate').handler({
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
      mockDuplicateFlow.mockResolvedValue({
        id: 'cfg_copy',
        name: 'Copy of...',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });
      await server
        .getTool('flow_duplicate')
        .handler({ flowId: 'cfg_abc', projectId: 'proj_1' });
      expect(mockDuplicateFlow).toHaveBeenCalledWith({
        flowId: 'cfg_abc',
        name: undefined,
        projectId: 'proj_1',
      });
    });

    it('strips content from result (write optimization)', async () => {
      mockDuplicateFlow.mockResolvedValue({
        id: 'cfg_copy',
        name: 'My Copy',
        content: { version: 2 },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });
      const result = await server.getTool('flow_duplicate').handler({
        flowId: 'cfg_abc',
        name: 'My Copy',
        projectId: 'proj_1',
      });
      expect(result.structuredContent.content).toBeUndefined();
    });
  });
});
