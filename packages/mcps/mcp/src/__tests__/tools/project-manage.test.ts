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

import { createProjectManageToolSpec } from '../../tools/project-manage.js';
import { stubClient } from '../support/stub-client.js';
import { structured, record, hintsOf, textOf } from '../support/tool-result.js';

describe('project_manage tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers with name "project_manage" and correct annotations', () => {
    const spec = createProjectManageToolSpec(stubClient());
    expect(spec.name).toBe('project_manage');
    expect(spec.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  describe('list', () => {
    it('returns projects data', async () => {
      const projects = {
        projects: [
          { id: 'proj_1', name: 'My Project' },
          { id: 'proj_2', name: 'Another Project' },
        ],
      };
      const listProjects = jest.fn().mockResolvedValue(projects);
      const spec = createProjectManageToolSpec(stubClient({ listProjects }));
      const result = await spec.handler({ action: 'list' });

      expect(listProjects).toHaveBeenCalledWith({
        cursor: undefined,
        limit: undefined,
      });
      expect(structured(result).projects).toEqual([
        { id: 'proj_1', name: '<user_data>My Project</user_data>' },
        { id: 'proj_2', name: '<user_data>Another Project</user_data>' },
      ]);
    });

    it('forwards cursor and limit to listProjects', async () => {
      const listProjects = jest.fn().mockResolvedValue({ projects: [] });
      const spec = createProjectManageToolSpec(stubClient({ listProjects }));
      await spec.handler({ action: 'list', cursor: 'abc', limit: 10 });

      expect(listProjects).toHaveBeenCalledWith({ cursor: 'abc', limit: 10 });
    });

    it('hints to create when projects list is empty', async () => {
      const listProjects = jest.fn().mockResolvedValue({ projects: [] });
      const spec = createProjectManageToolSpec(stubClient({ listProjects }));
      const result = await spec.handler({ action: 'list' });

      expect(structured(result).projects).toEqual([]);
      expect(hintsOf(result)).toEqual(
        expect.arrayContaining([expect.stringContaining('create')]),
      );
    });
  });

  describe('get', () => {
    it('requires projectId', async () => {
      const spec = createProjectManageToolSpec(stubClient());
      const result = await spec.handler({ action: 'get' });

      expect(record(result).isError).toBe(true);
      const parsed = record(JSON.parse(textOf(result)));
      expect(parsed.error).toContain('projectId is required for get action');
    });

    it('returns project data when projectId provided', async () => {
      const project = { id: 'proj_1', name: 'My Project' };
      const getProject = jest.fn().mockResolvedValue(project);
      const spec = createProjectManageToolSpec(stubClient({ getProject }));
      const result = await spec.handler({
        action: 'get',
        projectId: 'proj_1',
      });

      expect(getProject).toHaveBeenCalledWith({ projectId: 'proj_1' });
      expect(structured(result).id).toBe('proj_1');
    });
  });

  describe('create', () => {
    it('requires name', async () => {
      const spec = createProjectManageToolSpec(stubClient());
      const result = await spec.handler({ action: 'create' });

      expect(record(result).isError).toBe(true);
      const parsed = record(JSON.parse(textOf(result)));
      expect(parsed.error).toContain('name is required for create action');
    });

    it('calls createProject with name', async () => {
      const created = { id: 'proj_new', name: 'New Project' };
      const createProject = jest.fn().mockResolvedValue(created);
      const spec = createProjectManageToolSpec(stubClient({ createProject }));
      const result = await spec.handler({
        action: 'create',
        name: 'New Project',
      });

      expect(createProject).toHaveBeenCalledWith({ name: 'New Project' });
      expect(structured(result).id).toBe('proj_new');
      expect(hintsOf(result)).toEqual(
        expect.arrayContaining([expect.stringContaining('set_default')]),
      );
    });
  });

  describe('update', () => {
    it('requires projectId', async () => {
      const spec = createProjectManageToolSpec(stubClient());
      const result = await spec.handler({
        action: 'update',
        name: 'Renamed',
      });

      expect(record(result).isError).toBe(true);
      const parsed = record(JSON.parse(textOf(result)));
      expect(parsed.error).toContain('projectId is required for update action');
    });

    it('requires name', async () => {
      const spec = createProjectManageToolSpec(stubClient());
      const result = await spec.handler({
        action: 'update',
        projectId: 'proj_1',
      });

      expect(record(result).isError).toBe(true);
      const parsed = record(JSON.parse(textOf(result)));
      expect(parsed.error).toContain('name is required for update action');
    });

    it('calls updateProject with projectId and name', async () => {
      const updated = { id: 'proj_1', name: 'Renamed' };
      const updateProject = jest.fn().mockResolvedValue(updated);
      const spec = createProjectManageToolSpec(stubClient({ updateProject }));
      const result = await spec.handler({
        action: 'update',
        projectId: 'proj_1',
        name: 'Renamed',
      });

      expect(updateProject).toHaveBeenCalledWith({
        projectId: 'proj_1',
        name: 'Renamed',
      });
      expect(structured(result).name).toBe('<user_data>Renamed</user_data>');
    });
  });

  describe('delete', () => {
    it('requires projectId', async () => {
      const spec = createProjectManageToolSpec(stubClient());
      const result = await spec.handler({ action: 'delete' });

      expect(record(result).isError).toBe(true);
      const parsed = record(JSON.parse(textOf(result)));
      expect(parsed.error).toContain('projectId is required for delete action');
    });

    it('calls deleteProject with projectId', async () => {
      const deleteProject = jest.fn().mockResolvedValue({ success: true });
      const spec = createProjectManageToolSpec(stubClient({ deleteProject }));
      const result = await spec.handler({
        action: 'delete',
        projectId: 'proj_1',
      });

      expect(deleteProject).toHaveBeenCalledWith({ projectId: 'proj_1' });
      expect(structured(result).success).toBe(true);
    });
  });

  describe('set_default', () => {
    it('requires projectId', async () => {
      const spec = createProjectManageToolSpec(stubClient());
      const result = await spec.handler({ action: 'set_default' });

      expect(record(result).isError).toBe(true);
      const parsed = record(JSON.parse(textOf(result)));
      expect(parsed.error).toContain(
        'projectId is required for set_default action',
      );
    });

    it('calls setDefaultProject and hints about flow_manage', async () => {
      const setDefaultProject = jest.fn();
      const spec = createProjectManageToolSpec(
        stubClient({ setDefaultProject }),
      );
      const result = await spec.handler({
        action: 'set_default',
        projectId: 'proj_1',
      });

      expect(setDefaultProject).toHaveBeenCalledWith('proj_1');
      expect(structured(result).defaultProjectId).toBe('proj_1');
      expect(hintsOf(result)).toEqual(
        expect.arrayContaining([expect.stringContaining('flow_manage')]),
      );
    });
  });

  describe('error handling', () => {
    it('catches errors and returns mcpError with auth hint', async () => {
      const listProjects = jest
        .fn()
        .mockRejectedValue(new Error('Unauthorized'));
      const spec = createProjectManageToolSpec(stubClient({ listProjects }));
      const result = await spec.handler({ action: 'list' });

      expect(record(result).isError).toBe(true);
      const parsed = record(JSON.parse(textOf(result)));
      expect(parsed.error).toBe('Unauthorized');
      expect(parsed.hint).toContain('logged in');
    });
  });
});
