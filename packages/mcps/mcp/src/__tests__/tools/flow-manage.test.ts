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

import { createFlowManageToolSpec } from '../../tools/flow-manage.js';
import { CodedError } from '../support/coded-error.js';
import { stubClient } from '../support/stub-client.js';
import {
  structured,
  record,
  rows,
  hintsOf,
  textOf,
} from '../support/tool-result.js';

describe('flow_manage tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers with name "flow_manage" and correct annotations', () => {
    const spec = createFlowManageToolSpec(stubClient());
    expect(spec.name).toBe('flow_manage');
    expect(spec.annotations).toEqual({
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
      const spec = createFlowManageToolSpec(stubClient({ listAllFlows }));
      const result = await spec.handler({ action: 'list' });

      expect(listAllFlows).toHaveBeenCalledWith({
        sort: undefined,
        order: undefined,
        includeDeleted: undefined,
        cursor: undefined,
        limit: undefined,
      });
      expect(structured(result).projects).toEqual([
        {
          project: { id: 'proj_1', name: '<user_data>Project 1</user_data>' },
          flows: [{ id: 'flow_1', name: '<user_data>My Flow</user_data>' }],
        },
      ]);
    });

    it('with projectId calls listFlows', async () => {
      const flows = { flows: [{ id: 'flow_1', name: 'My Flow' }] };
      const listFlows = jest.fn().mockResolvedValue(flows);
      const spec = createFlowManageToolSpec(stubClient({ listFlows }));
      const result = await spec.handler({
        action: 'list',
        projectId: 'proj_1',
      });

      expect(listFlows).toHaveBeenCalledWith({
        projectId: 'proj_1',
        sort: undefined,
        order: undefined,
        includeDeleted: undefined,
        cursor: undefined,
        limit: undefined,
      });
      expect(structured(result).flows).toEqual([
        { id: 'flow_1', name: '<user_data>My Flow</user_data>' },
      ]);
    });

    it('forwards cursor and limit to listFlows', async () => {
      const flows = { flows: [{ id: 'flow_1', name: 'My Flow' }] };
      const listFlows = jest.fn().mockResolvedValue(flows);
      const spec = createFlowManageToolSpec(stubClient({ listFlows }));
      await spec.handler({
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

  describe('project fallback', () => {
    const origProjectId = process.env.WALKEROS_PROJECT_ID;

    afterEach(() => {
      if (origProjectId !== undefined) {
        process.env.WALKEROS_PROJECT_ID = origProjectId;
      } else {
        delete process.env.WALKEROS_PROJECT_ID;
      }
    });

    it('never reads WALKEROS_PROJECT_ID itself: only the door names a default', async () => {
      // A hosted door runs this layer in a shared server process, where the
      // variable is no person's selection.
      process.env.WALKEROS_PROJECT_ID = 'proj_server_env';
      const getFlow = jest.fn();
      const spec = createFlowManageToolSpec(
        stubClient({ getFlow, getDefaultProject: () => null }),
      );
      const result = await spec.handler({ action: 'get', flowId: 'flow_1' });

      expect(record(result).isError).toBe(true);
      expect(getFlow).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('requires flowId', async () => {
      const spec = createFlowManageToolSpec(stubClient());
      const result = await spec.handler({ action: 'get' });

      expect(record(result).isError).toBe(true);
      const parsed = record(JSON.parse(textOf(result)));
      expect(parsed.error).toContain('flowId is required for get action');
    });

    it('calls getFlow with fields', async () => {
      const flow = { id: 'flow_1', name: 'My Flow', content: {} };
      const getFlow = jest.fn().mockResolvedValue(flow);
      const spec = createFlowManageToolSpec(stubClient({ getFlow }));
      const result = await spec.handler({
        action: 'get',
        flowId: 'flow_1',
        projectId: 'proj_1',
        fields: ['name', 'content.flows'],
      });

      expect(getFlow).toHaveBeenCalledWith({
        flowId: 'flow_1',
        projectId: 'proj_1',
        fields: ['name', 'content.flows'],
      });
      expect(structured(result).kind).toBe('flow-canvas');
      expect(structured(result).flowId).toBe('flow_1');
    });

    it('errors with NO_DEFAULT_PROJECT message when no projectId and no default', async () => {
      const getFlow = jest.fn();
      const spec = createFlowManageToolSpec(
        stubClient({ getFlow, getDefaultProject: () => null }),
      );
      const result = await spec.handler({
        action: 'get',
        flowId: 'flow_1',
      });

      expect(record(result).isError).toBe(true);
      const parsed = record(JSON.parse(textOf(result)));
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
        const spec = createFlowManageToolSpec(
          stubClient({ getDefaultProject: () => null }),
        );
        const result = await spec.handler({
          action,
          ...params,
        });

        expect(record(result).isError).toBe(true);
        const parsed = record(JSON.parse(textOf(result)));
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
      const spec = createFlowManageToolSpec(
        stubClient({ getFlow, getDefaultProject: () => 'proj_default' }),
      );
      const result = await spec.handler({
        action: 'get',
        flowId: 'flow_1',
      });

      expect(getFlow).toHaveBeenCalledWith({
        flowId: 'flow_1',
        projectId: 'proj_default',
        fields: undefined,
      });
      expect(structured(result).flowId).toBe('flow_1');
    });

    it('reports top-level platform "web" for a web-only flow (not "server")', async () => {
      const flow = {
        id: 'flow_1',
        name: 'Web Flow',
        config: { flows: { default: { config: { platform: 'web' } } } },
      };
      const getFlow = jest.fn().mockResolvedValue(flow);
      const spec = createFlowManageToolSpec(stubClient({ getFlow }));
      const result = await spec.handler({
        action: 'get',
        flowId: 'flow_1',
        projectId: 'proj_1',
      });

      expect(structured(result).platform).toBe('web');
    });
  });

  describe('create', () => {
    it('requires name', async () => {
      const spec = createFlowManageToolSpec(stubClient());
      const result = await spec.handler({ action: 'create' });

      expect(record(result).isError).toBe(true);
      const parsed = record(JSON.parse(textOf(result)));
      expect(parsed.error).toContain('name is required for create action');
    });

    it('calls createFlow', async () => {
      const created = { id: 'flow_new', name: 'New Flow' };
      const createFlow = jest.fn().mockResolvedValue(created);
      const spec = createFlowManageToolSpec(stubClient({ createFlow }));
      const result = await spec.handler({
        action: 'create',
        name: 'New Flow',
        projectId: 'proj_1',
      });

      expect(createFlow).toHaveBeenCalledWith({
        name: 'New Flow',
        content: {},
        projectId: 'proj_1',
      });
      expect(structured(result).kind).toBe('flow-canvas');
      expect(structured(result).flowId).toBe('flow_new');
    });

    it('errors with NO_DEFAULT_PROJECT message when no projectId and no default', async () => {
      const createFlow = jest.fn();
      const spec = createFlowManageToolSpec(
        stubClient({ createFlow, getDefaultProject: () => null }),
      );
      const result = await spec.handler({
        action: 'create',
        name: 'New Flow',
      });

      expect(record(result).isError).toBe(true);
      const parsed = record(JSON.parse(textOf(result)));
      expect(parsed.error).toContain('No project selected');
      expect(parsed.error).not.toContain('Project not found');
      expect(createFlow).not.toHaveBeenCalled();
    });

    it('uses the default project when no projectId provided', async () => {
      const created = { id: 'flow_new', name: 'New Flow' };
      const createFlow = jest.fn().mockResolvedValue(created);
      const spec = createFlowManageToolSpec(
        stubClient({ createFlow, getDefaultProject: () => 'proj_default' }),
      );
      const result = await spec.handler({
        action: 'create',
        name: 'New Flow',
      });

      expect(createFlow).toHaveBeenCalledWith({
        name: 'New Flow',
        content: {},
        projectId: 'proj_default',
      });
      expect(structured(result).flowId).toBe('flow_new');
    });

    it('explicit projectId wins over the default and is passed through', async () => {
      const created = { id: 'flow_new', name: 'New Flow' };
      const createFlow = jest.fn().mockResolvedValue(created);
      const spec = createFlowManageToolSpec(
        stubClient({ createFlow, getDefaultProject: () => 'proj_default' }),
      );
      await spec.handler({
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
      const spec = createFlowManageToolSpec(stubClient());
      const result = await spec.handler({
        action: 'update',
        name: 'Renamed',
      });

      expect(record(result).isError).toBe(true);
      const parsed = record(JSON.parse(textOf(result)));
      expect(parsed.error).toContain('flowId is required for update action');
    });

    it('defaults patch to true (passes mergePatch: true)', async () => {
      const updated = { id: 'flow_1', name: 'Updated' };
      const updateFlow = jest.fn().mockResolvedValue(updated);
      const spec = createFlowManageToolSpec(
        stubClient({ updateFlow, getDefaultProject: () => 'proj_default' }),
      );
      const result = await spec.handler({
        action: 'update',
        flowId: 'flow_1',
        name: 'Updated',
      });

      expect(updateFlow).toHaveBeenCalledWith({
        flowId: 'flow_1',
        projectId: 'proj_default',
        name: 'Updated',
        content: undefined,
        mergePatch: true,
      });
      expect(structured(result).configName).toBe(
        '<user_data>Updated</user_data>',
      );
    });
  });

  describe('delete', () => {
    it('requires flowId', async () => {
      const spec = createFlowManageToolSpec(stubClient());
      const result = await spec.handler({ action: 'delete' });

      expect(record(result).isError).toBe(true);
      const parsed = record(JSON.parse(textOf(result)));
      expect(parsed.error).toContain('flowId is required for delete action');
    });

    it('calls deleteFlow', async () => {
      const deleteFlow = jest.fn().mockResolvedValue({ success: true });
      const spec = createFlowManageToolSpec(
        stubClient({ deleteFlow, getDefaultProject: () => 'proj_default' }),
      );
      const result = await spec.handler({
        action: 'delete',
        flowId: 'flow_1',
      });

      expect(deleteFlow).toHaveBeenCalledWith({
        flowId: 'flow_1',
        projectId: 'proj_default',
      });
      expect(structured(result).success).toBe(true);
    });
  });

  describe('duplicate', () => {
    it('requires flowId', async () => {
      const spec = createFlowManageToolSpec(stubClient());
      const result = await spec.handler({ action: 'duplicate' });

      expect(record(result).isError).toBe(true);
      const parsed = record(JSON.parse(textOf(result)));
      expect(parsed.error).toContain('flowId is required for duplicate action');
    });

    it('calls duplicateFlow', async () => {
      const duplicated = { id: 'flow_dup', name: 'My Flow (copy)' };
      const duplicateFlow = jest.fn().mockResolvedValue(duplicated);
      const spec = createFlowManageToolSpec(stubClient({ duplicateFlow }));
      const result = await spec.handler({
        action: 'duplicate',
        flowId: 'flow_1',
        name: 'My Flow Copy',
        projectId: 'proj_1',
      });

      expect(duplicateFlow).toHaveBeenCalledWith({
        flowId: 'flow_1',
        name: 'My Flow Copy',
        projectId: 'proj_1',
      });
      expect(structured(result).id).toBe('flow_dup');
    });
  });

  // A link belongs in the structured result, not only in prose: an agent reads
  // it as data and hands it on without retyping it out of a sentence.
  describe('links into the app', () => {
    it('links the flow page a get read', async () => {
      const getFlow = jest
        .fn()
        .mockResolvedValue({ id: 'flow_1', name: 'My Flow', content: {} });
      const spec = createFlowManageToolSpec(stubClient({ getFlow }));
      const result = await spec.handler({
        action: 'get',
        flowId: 'flow_1',
        projectId: 'proj_1',
      });

      expect(structured(result).appUrl).toBe(
        'https://app.walkeros.io/projects/proj_1/flows/flow_1',
      );
    });

    it('links the flow page a create just made', async () => {
      const createFlow = jest
        .fn()
        .mockResolvedValue({ id: 'flow_new', name: 'New Flow' });
      const spec = createFlowManageToolSpec(stubClient({ createFlow }));
      const result = await spec.handler({
        action: 'create',
        name: 'New Flow',
        projectId: 'proj_1',
      });

      expect(structured(result).appUrl).toBe(
        'https://app.walkeros.io/projects/proj_1/flows/flow_new',
      );
    });

    it('links nothing when the response carried no flow id', async () => {
      const getFlow = jest.fn().mockResolvedValue({ name: 'My Flow' });
      const spec = createFlowManageToolSpec(stubClient({ getFlow }));
      const result = await spec.handler({
        action: 'get',
        flowId: 'flow_1',
        projectId: 'proj_1',
      });

      expect(structured(result)).not.toHaveProperty('appUrl');
    });
  });

  describe('error handling', () => {
    it('catches errors and returns mcpError with auth hint', async () => {
      const listAllFlows = jest
        .fn()
        .mockRejectedValue(new CodedError('Unauthorized', 'UNAUTHORIZED', 401));
      const spec = createFlowManageToolSpec(stubClient({ listAllFlows }));
      const result = await spec.handler({ action: 'list' });

      expect(record(result).isError).toBe(true);
      const parsed = record(JSON.parse(textOf(result)));
      expect(parsed.error).toBe('Unauthorized');
      expect(parsed.hint).toContain('logged in');
    });
  });
});
