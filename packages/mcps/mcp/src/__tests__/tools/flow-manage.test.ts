import { registerFlowManageTool } from '../../tools/flow-manage.js';

jest.mock('@walkeros/cli', () => ({
  listAllFlows: jest.fn(),
  listFlows: jest.fn(),
  getFlow: jest.fn(),
  createFlow: jest.fn(),
  updateFlow: jest.fn(),
  deleteFlow: jest.fn(),
  duplicateFlow: jest.fn(),
}));

jest.mock('@walkeros/core', () => ({
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
  mcpError: jest.fn((error, hint) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          ...(hint ? { hint } : {}),
        }),
      },
    ],
    isError: true,
  })),
}));

import {
  listAllFlows,
  listFlows,
  getFlow,
  createFlow,
  updateFlow,
  deleteFlow,
  duplicateFlow,
} from '@walkeros/cli';

const mockListAllFlows = jest.mocked(listAllFlows);
const mockListFlows = jest.mocked(listFlows);
const mockGetFlow = jest.mocked(getFlow);
const mockCreateFlow = jest.mocked(createFlow);
const mockUpdateFlow = jest.mocked(updateFlow);
const mockDeleteFlow = jest.mocked(deleteFlow);
const mockDuplicateFlow = jest.mocked(duplicateFlow);

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

describe('flow_manage tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
    registerFlowManageTool(server as any);
  });

  it('registers with name "flow_manage" and correct annotations', () => {
    const tool = server.getTool('flow_manage');
    expect(tool).toBeDefined();

    const config = tool.config as any;
    expect(config.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  describe('list', () => {
    it('without projectId calls listAllFlows', async () => {
      const allFlows = [
        {
          project: { id: 'proj_1', name: 'Project 1' },
          flows: [{ id: 'flow_1', name: 'My Flow' }],
        },
      ];
      mockListAllFlows.mockResolvedValue(allFlows);

      const tool = server.getTool('flow_manage');
      const result = await tool.handler({ action: 'list' });

      expect(mockListAllFlows).toHaveBeenCalledWith({
        sort: undefined,
        order: undefined,
        includeDeleted: undefined,
      });
      expect(result.structuredContent.projects).toEqual(allFlows);
    });

    it('with projectId calls listFlows', async () => {
      const flows = { flows: [{ id: 'flow_1', name: 'My Flow' }] };
      mockListFlows.mockResolvedValue(flows);

      const tool = server.getTool('flow_manage');
      const result = await tool.handler({
        action: 'list',
        projectId: 'proj_1',
      });

      expect(mockListFlows).toHaveBeenCalledWith({
        projectId: 'proj_1',
        sort: undefined,
        order: undefined,
        includeDeleted: undefined,
      });
      expect(result.structuredContent.flows).toEqual(flows.flows);
    });
  });

  describe('get', () => {
    it('requires flowId', async () => {
      const tool = server.getTool('flow_manage');
      const result = await tool.handler({ action: 'get' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('flowId is required');
    });

    it('calls getFlow with fields', async () => {
      const flow = { id: 'flow_1', name: 'My Flow', content: {} };
      mockGetFlow.mockResolvedValue(flow);

      const tool = server.getTool('flow_manage');
      const result = await tool.handler({
        action: 'get',
        flowId: 'flow_1',
        fields: ['name', 'content.flows'],
      });

      expect(mockGetFlow).toHaveBeenCalledWith({
        flowId: 'flow_1',
        projectId: undefined,
        fields: ['name', 'content.flows'],
      });
      expect(result.structuredContent.id).toBe('flow_1');
    });
  });

  describe('create', () => {
    it('requires name', async () => {
      const tool = server.getTool('flow_manage');
      const result = await tool.handler({ action: 'create' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('name is required');
    });

    it('calls createFlow', async () => {
      const created = { id: 'flow_new', name: 'New Flow' };
      mockCreateFlow.mockResolvedValue(created);

      const tool = server.getTool('flow_manage');
      const result = await tool.handler({
        action: 'create',
        name: 'New Flow',
        projectId: 'proj_1',
      });

      expect(mockCreateFlow).toHaveBeenCalledWith({
        name: 'New Flow',
        content: {},
        projectId: 'proj_1',
      });
      expect(result.structuredContent.id).toBe('flow_new');
    });
  });

  describe('update', () => {
    it('requires flowId', async () => {
      const tool = server.getTool('flow_manage');
      const result = await tool.handler({
        action: 'update',
        name: 'Renamed',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('flowId is required');
    });

    it('defaults patch to true (passes mergePatch: true)', async () => {
      const updated = { id: 'flow_1', name: 'Updated' };
      mockUpdateFlow.mockResolvedValue(updated);

      const tool = server.getTool('flow_manage');
      const result = await tool.handler({
        action: 'update',
        flowId: 'flow_1',
        name: 'Updated',
      });

      expect(mockUpdateFlow).toHaveBeenCalledWith({
        flowId: 'flow_1',
        projectId: undefined,
        name: 'Updated',
        content: undefined,
        mergePatch: true,
      });
      expect(result.structuredContent.name).toBe('Updated');
    });
  });

  describe('delete', () => {
    it('requires flowId', async () => {
      const tool = server.getTool('flow_manage');
      const result = await tool.handler({ action: 'delete' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('flowId is required');
    });

    it('calls deleteFlow', async () => {
      mockDeleteFlow.mockResolvedValue({ success: true });

      const tool = server.getTool('flow_manage');
      const result = await tool.handler({
        action: 'delete',
        flowId: 'flow_1',
      });

      expect(mockDeleteFlow).toHaveBeenCalledWith({
        flowId: 'flow_1',
        projectId: undefined,
      });
      expect(result.structuredContent.success).toBe(true);
    });
  });

  describe('duplicate', () => {
    it('requires flowId', async () => {
      const tool = server.getTool('flow_manage');
      const result = await tool.handler({ action: 'duplicate' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('flowId is required');
    });

    it('calls duplicateFlow', async () => {
      const duplicated = { id: 'flow_dup', name: 'My Flow (copy)' };
      mockDuplicateFlow.mockResolvedValue(duplicated);

      const tool = server.getTool('flow_manage');
      const result = await tool.handler({
        action: 'duplicate',
        flowId: 'flow_1',
        name: 'My Flow Copy',
        projectId: 'proj_1',
      });

      expect(mockDuplicateFlow).toHaveBeenCalledWith({
        flowId: 'flow_1',
        name: 'My Flow Copy',
        projectId: 'proj_1',
      });
      expect(result.structuredContent.id).toBe('flow_dup');
    });
  });

  describe('error handling', () => {
    it('catches errors and returns mcpError with auth hint', async () => {
      mockListAllFlows.mockRejectedValue(new Error('Unauthorized'));

      const tool = server.getTool('flow_manage');
      const result = await tool.handler({ action: 'list' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Unauthorized');
      expect(parsed.hint).toContain('logged in');
    });
  });
});
