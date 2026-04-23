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

import { registerFlowManageTool } from '../../tools/flow-manage.js';
import { stubClient } from '../support/stub-client.js';

type HandlerFn = (input: Record<string, unknown>) => Promise<unknown>;

function createMockServer() {
  const tools: Record<string, { config: unknown; handler: HandlerFn }> = {};
  return {
    registerTool(name: string, config: unknown, handler: HandlerFn) {
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
  });

  it('registers with name "flow_manage" and correct annotations', () => {
    registerFlowManageTool(server as never, stubClient());
    const tool = server.getTool('flow_manage');
    expect(tool).toBeDefined();
    const config = tool!.config as { annotations: Record<string, boolean> };
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
      const listAllFlows = jest.fn().mockResolvedValue(allFlows);
      registerFlowManageTool(server as never, stubClient({ listAllFlows }));

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({ action: 'list' })) as {
        structuredContent: { projects: unknown[] };
      };

      expect(listAllFlows).toHaveBeenCalledWith({
        sort: undefined,
        order: undefined,
        includeDeleted: undefined,
      });
      expect(result.structuredContent.projects).toEqual(allFlows);
    });

    it('with projectId calls listFlows', async () => {
      const flows = { flows: [{ id: 'flow_1', name: 'My Flow' }] };
      const listFlows = jest.fn().mockResolvedValue(flows);
      registerFlowManageTool(server as never, stubClient({ listFlows }));

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({
        action: 'list',
        projectId: 'proj_1',
      })) as { structuredContent: { flows: unknown[] } };

      expect(listFlows).toHaveBeenCalledWith({
        projectId: 'proj_1',
        sort: undefined,
        order: undefined,
        includeDeleted: undefined,
      });
      expect(result.structuredContent.flows).toEqual([
        { id: 'flow_1', name: '<user_data>My Flow</user_data>' },
      ]);
    });
  });

  describe('get', () => {
    it('requires flowId', async () => {
      registerFlowManageTool(server as never, stubClient());
      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({ action: 'get' })) as {
        isError: boolean;
        content: Array<{ text: string }>;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('flowId is required');
    });

    it('calls getFlow with fields', async () => {
      const flow = { id: 'flow_1', name: 'My Flow', content: {} };
      const getFlow = jest.fn().mockResolvedValue(flow);
      registerFlowManageTool(server as never, stubClient({ getFlow }));

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({
        action: 'get',
        flowId: 'flow_1',
        fields: ['name', 'content.flows'],
      })) as {
        structuredContent: { kind: string; flowId: string; configName: string };
      };

      expect(getFlow).toHaveBeenCalledWith({
        flowId: 'flow_1',
        projectId: undefined,
        fields: ['name', 'content.flows'],
      });
      expect(result.structuredContent.kind).toBe('flow-canvas');
      expect(result.structuredContent.flowId).toBe('flow_1');
    });
  });

  describe('create', () => {
    it('requires name', async () => {
      registerFlowManageTool(server as never, stubClient());
      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({ action: 'create' })) as {
        isError: boolean;
        content: Array<{ text: string }>;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('name is required');
    });

    it('calls createFlow', async () => {
      const created = { id: 'flow_new', name: 'New Flow' };
      const createFlow = jest.fn().mockResolvedValue(created);
      registerFlowManageTool(server as never, stubClient({ createFlow }));

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({
        action: 'create',
        name: 'New Flow',
        projectId: 'proj_1',
      })) as {
        structuredContent: { kind: string; flowId: string; configName: string };
      };

      expect(createFlow).toHaveBeenCalledWith({
        name: 'New Flow',
        content: {},
        projectId: 'proj_1',
      });
      expect(result.structuredContent.kind).toBe('flow-canvas');
      expect(result.structuredContent.flowId).toBe('flow_new');
    });
  });

  describe('update', () => {
    it('requires flowId', async () => {
      registerFlowManageTool(server as never, stubClient());
      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({
        action: 'update',
        name: 'Renamed',
      })) as { isError: boolean; content: Array<{ text: string }> };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('flowId is required');
    });

    it('defaults patch to true (passes mergePatch: true)', async () => {
      const updated = { id: 'flow_1', name: 'Updated' };
      const updateFlow = jest.fn().mockResolvedValue(updated);
      registerFlowManageTool(server as never, stubClient({ updateFlow }));

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({
        action: 'update',
        flowId: 'flow_1',
        name: 'Updated',
      })) as { structuredContent: { name: string } };

      expect(updateFlow).toHaveBeenCalledWith({
        flowId: 'flow_1',
        projectId: undefined,
        name: 'Updated',
        content: undefined,
        mergePatch: true,
      });
      expect(result.structuredContent.configName).toBe(
        '<user_data>Updated</user_data>',
      );
    });
  });

  describe('delete', () => {
    it('requires flowId', async () => {
      registerFlowManageTool(server as never, stubClient());
      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({ action: 'delete' })) as {
        isError: boolean;
        content: Array<{ text: string }>;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('flowId is required');
    });

    it('calls deleteFlow', async () => {
      const deleteFlow = jest.fn().mockResolvedValue({ success: true });
      registerFlowManageTool(server as never, stubClient({ deleteFlow }));

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({
        action: 'delete',
        flowId: 'flow_1',
      })) as { structuredContent: { success: boolean } };

      expect(deleteFlow).toHaveBeenCalledWith({
        flowId: 'flow_1',
        projectId: undefined,
      });
      expect(result.structuredContent.success).toBe(true);
    });
  });

  describe('duplicate', () => {
    it('requires flowId', async () => {
      registerFlowManageTool(server as never, stubClient());
      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({ action: 'duplicate' })) as {
        isError: boolean;
        content: Array<{ text: string }>;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('flowId is required');
    });

    it('calls duplicateFlow', async () => {
      const duplicated = { id: 'flow_dup', name: 'My Flow (copy)' };
      const duplicateFlow = jest.fn().mockResolvedValue(duplicated);
      registerFlowManageTool(server as never, stubClient({ duplicateFlow }));

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({
        action: 'duplicate',
        flowId: 'flow_1',
        name: 'My Flow Copy',
        projectId: 'proj_1',
      })) as { structuredContent: { id: string } };

      expect(duplicateFlow).toHaveBeenCalledWith({
        flowId: 'flow_1',
        name: 'My Flow Copy',
        projectId: 'proj_1',
      });
      expect(result.structuredContent.id).toBe('flow_dup');
    });
  });

  describe('error handling', () => {
    it('catches errors and returns mcpError with auth hint', async () => {
      const listAllFlows = jest
        .fn()
        .mockRejectedValue(new Error('Unauthorized'));
      registerFlowManageTool(server as never, stubClient({ listAllFlows }));

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({ action: 'list' })) as {
        isError: boolean;
        content: Array<{ text: string }>;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Unauthorized');
      expect(parsed.hint).toContain('logged in');
    });
  });
});
