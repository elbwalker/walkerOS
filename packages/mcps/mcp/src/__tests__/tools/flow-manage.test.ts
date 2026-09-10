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
        cursor: undefined,
        limit: undefined,
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
        cursor: undefined,
        limit: undefined,
      });
      expect(result.structuredContent.flows).toEqual([
        { id: 'flow_1', name: '<user_data>My Flow</user_data>' },
      ]);
    });

    it('forwards cursor and limit to listFlows', async () => {
      const flows = { flows: [{ id: 'flow_1', name: 'My Flow' }] };
      const listFlows = jest.fn().mockResolvedValue(flows);
      registerFlowManageTool(server as never, stubClient({ listFlows }));

      const tool = server.getTool('flow_manage')!;
      await tool.handler({
        action: 'list',
        projectId: 'proj_1',
        cursor: 'xyz',
        limit: 5,
      });

      expect(listFlows).toHaveBeenCalledWith({
        projectId: 'proj_1',
        sort: undefined,
        order: undefined,
        includeDeleted: undefined,
        cursor: 'xyz',
        limit: 5,
      });
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
      expect(parsed.error).toContain('flowId is required for get action');
    });

    it('calls getFlow with fields', async () => {
      const flow = { id: 'flow_1', name: 'My Flow', content: {} };
      const getFlow = jest.fn().mockResolvedValue(flow);
      registerFlowManageTool(server as never, stubClient({ getFlow }));

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({
        action: 'get',
        flowId: 'flow_1',
        projectId: 'proj_1',
        fields: ['name', 'content.flows'],
      })) as {
        structuredContent: { kind: string; flowId: string; configName: string };
      };

      expect(getFlow).toHaveBeenCalledWith({
        flowId: 'flow_1',
        projectId: 'proj_1',
        fields: ['name', 'content.flows'],
      });
      expect(result.structuredContent.kind).toBe('flow-canvas');
      expect(result.structuredContent.flowId).toBe('flow_1');
    });

    it('errors with NO_DEFAULT_PROJECT message when no projectId and no default', async () => {
      const getFlow = jest.fn();
      registerFlowManageTool(
        server as never,
        stubClient({ getFlow, getDefaultProject: () => null }),
      );

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({
        action: 'get',
        flowId: 'flow_1',
      })) as { isError: boolean; content: Array<{ text: string }> };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('No project selected');
      expect(parsed.error).not.toContain('Flow not found');
      expect(getFlow).not.toHaveBeenCalled();
    });

    /**
     * Six of the eleven actions once skipped the project resolver and fell
     * straight through to a service error with no remedy in it, which is how a
     * real session lost a config. The roster is the point of this case: an
     * action added without the guard fails here instead of in someone's chat.
     *
     * `list` is deliberately absent. Without a project it lists across every
     * project the caller belongs to, which is an answer rather than a failure.
     */
    it.each([
      ['get', { flowId: 'flow_1' }],
      ['update', { flowId: 'flow_1' }],
      ['delete', { flowId: 'flow_1' }],
      ['duplicate', { flowId: 'flow_1' }],
      ['create', { name: 'New flow' }],
      ['preview_list', { flowId: 'flow_1' }],
      ['preview_get', { flowId: 'flow_1', previewId: 'prev_1' }],
      ['preview_create', { flowId: 'flow_1', flowName: 'My Flow' }],
      ['preview_delete', { flowId: 'flow_1', previewId: 'prev_1' }],
      ['preview_regrant', { flowId: 'flow_1', previewId: 'prev_1' }],
    ])(
      'action %s refuses without a project and names the remedy',
      async (action, params) => {
        registerFlowManageTool(
          server as never,
          stubClient({ getDefaultProject: () => null }),
        );

        const tool = server.getTool('flow_manage')!;
        const result = (await tool.handler({
          action,
          ...(params as Record<string, unknown>),
        })) as { isError: boolean; content: Array<{ text: string }> };

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0].text);
        // Both remedies. Either one alone still leaves a caller stuck: the
        // per-call argument is the one that always works, and the selection is
        // the one that saves repeating it.
        expect(parsed.error).toContain('Pass projectId on this call');
        expect(parsed.error).toContain('set_default');
      },
    );

    it('uses the default project when no projectId provided', async () => {
      const flow = { id: 'flow_1', name: 'My Flow', content: {} };
      const getFlow = jest.fn().mockResolvedValue(flow);
      registerFlowManageTool(
        server as never,
        stubClient({ getFlow, getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({
        action: 'get',
        flowId: 'flow_1',
      })) as { structuredContent: { flowId: string } };

      expect(getFlow).toHaveBeenCalledWith({
        flowId: 'flow_1',
        projectId: 'proj_default',
        fields: undefined,
      });
      expect(result.structuredContent.flowId).toBe('flow_1');
    });

    it('reports top-level platform "web" for a web-only flow (not "server")', async () => {
      const flow = {
        id: 'flow_1',
        name: 'Web Flow',
        config: { flows: { default: { config: { platform: 'web' } } } },
      };
      const getFlow = jest.fn().mockResolvedValue(flow);
      registerFlowManageTool(server as never, stubClient({ getFlow }));

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({
        action: 'get',
        flowId: 'flow_1',
        projectId: 'proj_1',
      })) as { structuredContent: { platform: string } };

      expect(result.structuredContent.platform).toBe('web');
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
      expect(parsed.error).toContain('name is required for create action');
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

    it('errors with NO_DEFAULT_PROJECT message when no projectId and no default', async () => {
      const createFlow = jest.fn();
      registerFlowManageTool(
        server as never,
        stubClient({ createFlow, getDefaultProject: () => null }),
      );

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({
        action: 'create',
        name: 'New Flow',
      })) as { isError: boolean; content: Array<{ text: string }> };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('No project selected');
      expect(parsed.error).not.toContain('Project not found');
      expect(createFlow).not.toHaveBeenCalled();
    });

    it('uses the default project when no projectId provided', async () => {
      const created = { id: 'flow_new', name: 'New Flow' };
      const createFlow = jest.fn().mockResolvedValue(created);
      registerFlowManageTool(
        server as never,
        stubClient({ createFlow, getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({
        action: 'create',
        name: 'New Flow',
      })) as { structuredContent: { flowId: string } };

      expect(createFlow).toHaveBeenCalledWith({
        name: 'New Flow',
        content: {},
        projectId: 'proj_default',
      });
      expect(result.structuredContent.flowId).toBe('flow_new');
    });

    it('explicit projectId wins over the default and is passed through', async () => {
      const created = { id: 'flow_new', name: 'New Flow' };
      const createFlow = jest.fn().mockResolvedValue(created);
      registerFlowManageTool(
        server as never,
        stubClient({ createFlow, getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('flow_manage')!;
      await tool.handler({
        action: 'create',
        name: 'New Flow',
        projectId: 'proj_explicit',
      });

      expect(createFlow).toHaveBeenCalledWith({
        name: 'New Flow',
        content: {},
        projectId: 'proj_explicit',
      });
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
      expect(parsed.error).toContain('flowId is required for update action');
    });

    it('defaults patch to true (passes mergePatch: true)', async () => {
      const updated = { id: 'flow_1', name: 'Updated' };
      const updateFlow = jest.fn().mockResolvedValue(updated);
      registerFlowManageTool(
        server as never,
        stubClient({ updateFlow, getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({
        action: 'update',
        flowId: 'flow_1',
        name: 'Updated',
      })) as { structuredContent: { configName: string } };

      expect(updateFlow).toHaveBeenCalledWith({
        flowId: 'flow_1',
        projectId: 'proj_default',
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
      expect(parsed.error).toContain('flowId is required for delete action');
    });

    it('calls deleteFlow', async () => {
      const deleteFlow = jest.fn().mockResolvedValue({ success: true });
      registerFlowManageTool(
        server as never,
        stubClient({ deleteFlow, getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({
        action: 'delete',
        flowId: 'flow_1',
      })) as { structuredContent: { success: boolean } };

      expect(deleteFlow).toHaveBeenCalledWith({
        flowId: 'flow_1',
        projectId: 'proj_default',
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
      expect(parsed.error).toContain('flowId is required for duplicate action');
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

  // A link belongs in the structured result, not only in prose: an agent reads
  // it as data and hands it on without retyping it out of a sentence.
  describe('links into the app', () => {
    it('links the flow page a get read', async () => {
      const getFlow = jest
        .fn()
        .mockResolvedValue({ id: 'flow_1', name: 'My Flow', content: {} });
      registerFlowManageTool(server as never, stubClient({ getFlow }));

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({
        action: 'get',
        flowId: 'flow_1',
        projectId: 'proj_1',
      })) as { structuredContent: { appUrl?: string } };

      expect(result.structuredContent.appUrl).toBe(
        'https://app.walkeros.io/projects/proj_1/flows/flow_1',
      );
    });

    it('links the flow page a create just made', async () => {
      const createFlow = jest
        .fn()
        .mockResolvedValue({ id: 'flow_new', name: 'New Flow' });
      registerFlowManageTool(server as never, stubClient({ createFlow }));

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({
        action: 'create',
        name: 'New Flow',
        projectId: 'proj_1',
      })) as { structuredContent: { appUrl?: string } };

      expect(result.structuredContent.appUrl).toBe(
        'https://app.walkeros.io/projects/proj_1/flows/flow_new',
      );
    });

    it('links nothing when the response carried no flow id', async () => {
      const getFlow = jest.fn().mockResolvedValue({ name: 'My Flow' });
      registerFlowManageTool(server as never, stubClient({ getFlow }));

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler({
        action: 'get',
        flowId: 'flow_1',
        projectId: 'proj_1',
      })) as { structuredContent: Record<string, unknown> };

      expect(result.structuredContent).not.toHaveProperty('appUrl');
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
