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

import { registerProjectManageTool } from '../../tools/project-manage.js';
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

describe('project_manage tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
  });

  it('registers with name "project_manage" and correct annotations', () => {
    registerProjectManageTool(server as never, stubClient());
    const tool = server.getTool('project_manage');
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
    it('returns projects data', async () => {
      const projects = {
        projects: [
          { id: 'proj_1', name: 'My Project' },
          { id: 'proj_2', name: 'Another Project' },
        ],
      };
      const listProjects = jest.fn().mockResolvedValue(projects);
      registerProjectManageTool(server as never, stubClient({ listProjects }));

      const tool = server.getTool('project_manage')!;
      const result = (await tool.handler({ action: 'list' })) as {
        structuredContent: { projects: unknown[] };
      };

      expect(listProjects).toHaveBeenCalled();
      expect(result.structuredContent.projects).toEqual(projects.projects);
    });

    it('hints to create when projects list is empty', async () => {
      const listProjects = jest.fn().mockResolvedValue({ projects: [] });
      registerProjectManageTool(server as never, stubClient({ listProjects }));

      const tool = server.getTool('project_manage')!;
      const result = (await tool.handler({ action: 'list' })) as {
        structuredContent: { projects: unknown[]; _hints: { next: string[] } };
      };

      expect(result.structuredContent.projects).toEqual([]);
      expect(result.structuredContent._hints.next).toEqual(
        expect.arrayContaining([expect.stringContaining('create')]),
      );
    });
  });

  describe('get', () => {
    it('requires projectId', async () => {
      registerProjectManageTool(server as never, stubClient());
      const tool = server.getTool('project_manage')!;
      const result = (await tool.handler({ action: 'get' })) as {
        isError: boolean;
        content: Array<{ text: string }>;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('projectId is required');
    });

    it('returns project data when projectId provided', async () => {
      const project = { id: 'proj_1', name: 'My Project' };
      const getProject = jest.fn().mockResolvedValue(project);
      registerProjectManageTool(server as never, stubClient({ getProject }));

      const tool = server.getTool('project_manage')!;
      const result = (await tool.handler({
        action: 'get',
        projectId: 'proj_1',
      })) as { structuredContent: { id: string } };

      expect(getProject).toHaveBeenCalledWith({ projectId: 'proj_1' });
      expect(result.structuredContent.id).toBe('proj_1');
    });
  });

  describe('create', () => {
    it('requires name', async () => {
      registerProjectManageTool(server as never, stubClient());
      const tool = server.getTool('project_manage')!;
      const result = (await tool.handler({ action: 'create' })) as {
        isError: boolean;
        content: Array<{ text: string }>;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('name is required');
    });

    it('calls createProject with name', async () => {
      const created = { id: 'proj_new', name: 'New Project' };
      const createProject = jest.fn().mockResolvedValue(created);
      registerProjectManageTool(server as never, stubClient({ createProject }));

      const tool = server.getTool('project_manage')!;
      const result = (await tool.handler({
        action: 'create',
        name: 'New Project',
      })) as {
        structuredContent: { id: string; _hints: { next: string[] } };
      };

      expect(createProject).toHaveBeenCalledWith({ name: 'New Project' });
      expect(result.structuredContent.id).toBe('proj_new');
      expect(result.structuredContent._hints.next).toEqual(
        expect.arrayContaining([expect.stringContaining('set_default')]),
      );
    });
  });

  describe('update', () => {
    it('requires projectId', async () => {
      registerProjectManageTool(server as never, stubClient());
      const tool = server.getTool('project_manage')!;
      const result = (await tool.handler({
        action: 'update',
        name: 'Renamed',
      })) as { isError: boolean; content: Array<{ text: string }> };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('projectId is required');
    });

    it('requires name', async () => {
      registerProjectManageTool(server as never, stubClient());
      const tool = server.getTool('project_manage')!;
      const result = (await tool.handler({
        action: 'update',
        projectId: 'proj_1',
      })) as { isError: boolean; content: Array<{ text: string }> };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('name is required');
    });

    it('calls updateProject with projectId and name', async () => {
      const updated = { id: 'proj_1', name: 'Renamed' };
      const updateProject = jest.fn().mockResolvedValue(updated);
      registerProjectManageTool(server as never, stubClient({ updateProject }));

      const tool = server.getTool('project_manage')!;
      const result = (await tool.handler({
        action: 'update',
        projectId: 'proj_1',
        name: 'Renamed',
      })) as { structuredContent: { name: string } };

      expect(updateProject).toHaveBeenCalledWith({
        projectId: 'proj_1',
        name: 'Renamed',
      });
      expect(result.structuredContent.name).toBe('Renamed');
    });
  });

  describe('delete', () => {
    it('requires projectId', async () => {
      registerProjectManageTool(server as never, stubClient());
      const tool = server.getTool('project_manage')!;
      const result = (await tool.handler({ action: 'delete' })) as {
        isError: boolean;
        content: Array<{ text: string }>;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('projectId is required');
    });

    it('calls deleteProject with projectId', async () => {
      const deleteProject = jest.fn().mockResolvedValue({ success: true });
      registerProjectManageTool(server as never, stubClient({ deleteProject }));

      const tool = server.getTool('project_manage')!;
      const result = (await tool.handler({
        action: 'delete',
        projectId: 'proj_1',
      })) as { structuredContent: { success: boolean } };

      expect(deleteProject).toHaveBeenCalledWith({ projectId: 'proj_1' });
      expect(result.structuredContent.success).toBe(true);
    });
  });

  describe('set_default', () => {
    it('requires projectId', async () => {
      registerProjectManageTool(server as never, stubClient());
      const tool = server.getTool('project_manage')!;
      const result = (await tool.handler({ action: 'set_default' })) as {
        isError: boolean;
        content: Array<{ text: string }>;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('projectId is required');
    });

    it('calls setDefaultProject and hints about flow_manage', async () => {
      const setDefaultProject = jest.fn();
      registerProjectManageTool(
        server as never,
        stubClient({ setDefaultProject }),
      );

      const tool = server.getTool('project_manage')!;
      const result = (await tool.handler({
        action: 'set_default',
        projectId: 'proj_1',
      })) as {
        structuredContent: {
          defaultProjectId: string;
          _hints: { next: string[] };
        };
      };

      expect(setDefaultProject).toHaveBeenCalledWith('proj_1');
      expect(result.structuredContent.defaultProjectId).toBe('proj_1');
      expect(result.structuredContent._hints.next).toEqual(
        expect.arrayContaining([expect.stringContaining('flow_manage')]),
      );
    });
  });

  describe('error handling', () => {
    it('catches errors and returns mcpError with auth hint', async () => {
      const listProjects = jest
        .fn()
        .mockRejectedValue(new Error('Unauthorized'));
      registerProjectManageTool(server as never, stubClient({ listProjects }));

      const tool = server.getTool('project_manage')!;
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
