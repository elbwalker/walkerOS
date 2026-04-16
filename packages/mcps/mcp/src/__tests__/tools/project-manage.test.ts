import { registerProjectManageTool } from '../../tools/project-manage.js';

jest.mock('@walkeros/cli', () => ({
  listProjects: jest.fn(),
  getProject: jest.fn(),
  createProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  setDefaultProject: jest.fn(),
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
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  setDefaultProject,
} from '@walkeros/cli';

const mockListProjects = jest.mocked(listProjects);
const mockGetProject = jest.mocked(getProject);
const mockCreateProject = jest.mocked(createProject);
const mockUpdateProject = jest.mocked(updateProject);
const mockDeleteProject = jest.mocked(deleteProject);
const mockSetDefaultProject = jest.mocked(setDefaultProject);

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

describe('project_manage tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
    registerProjectManageTool(server as any);
  });

  it('registers with name "project_manage" and correct annotations', () => {
    const tool = server.getTool('project_manage');
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
    it('returns projects data', async () => {
      const projects = {
        projects: [
          { id: 'proj_1', name: 'My Project' },
          { id: 'proj_2', name: 'Another Project' },
        ],
      };
      mockListProjects.mockResolvedValue(projects);

      const tool = server.getTool('project_manage');
      const result = await tool.handler({ action: 'list' });

      expect(mockListProjects).toHaveBeenCalled();
      expect(result.structuredContent.projects).toEqual(projects.projects);
    });

    it('hints to create when projects list is empty', async () => {
      mockListProjects.mockResolvedValue({ projects: [] });

      const tool = server.getTool('project_manage');
      const result = await tool.handler({ action: 'list' });

      expect(result.structuredContent.projects).toEqual([]);
      expect(result.structuredContent._hints.next).toEqual(
        expect.arrayContaining([expect.stringContaining('create')]),
      );
    });
  });

  describe('get', () => {
    it('requires projectId', async () => {
      const tool = server.getTool('project_manage');
      const result = await tool.handler({ action: 'get' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('projectId is required');
    });

    it('returns project data when projectId provided', async () => {
      const project = { id: 'proj_1', name: 'My Project' };
      mockGetProject.mockResolvedValue(project);

      const tool = server.getTool('project_manage');
      const result = await tool.handler({
        action: 'get',
        projectId: 'proj_1',
      });

      expect(mockGetProject).toHaveBeenCalledWith({ projectId: 'proj_1' });
      expect(result.structuredContent.id).toBe('proj_1');
    });
  });

  describe('create', () => {
    it('requires name', async () => {
      const tool = server.getTool('project_manage');
      const result = await tool.handler({ action: 'create' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('name is required');
    });

    it('calls createProject with name', async () => {
      const created = { id: 'proj_new', name: 'New Project' };
      mockCreateProject.mockResolvedValue(created);

      const tool = server.getTool('project_manage');
      const result = await tool.handler({
        action: 'create',
        name: 'New Project',
      });

      expect(mockCreateProject).toHaveBeenCalledWith({ name: 'New Project' });
      expect(result.structuredContent.id).toBe('proj_new');
      expect(result.structuredContent._hints.next).toEqual(
        expect.arrayContaining([expect.stringContaining('set_default')]),
      );
    });
  });

  describe('update', () => {
    it('requires projectId', async () => {
      const tool = server.getTool('project_manage');
      const result = await tool.handler({
        action: 'update',
        name: 'Renamed',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('projectId is required');
    });

    it('requires name', async () => {
      const tool = server.getTool('project_manage');
      const result = await tool.handler({
        action: 'update',
        projectId: 'proj_1',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('name is required');
    });

    it('calls updateProject with projectId and name', async () => {
      const updated = { id: 'proj_1', name: 'Renamed' };
      mockUpdateProject.mockResolvedValue(updated);

      const tool = server.getTool('project_manage');
      const result = await tool.handler({
        action: 'update',
        projectId: 'proj_1',
        name: 'Renamed',
      });

      expect(mockUpdateProject).toHaveBeenCalledWith({
        projectId: 'proj_1',
        name: 'Renamed',
      });
      expect(result.structuredContent.name).toBe('Renamed');
    });
  });

  describe('delete', () => {
    it('requires projectId', async () => {
      const tool = server.getTool('project_manage');
      const result = await tool.handler({ action: 'delete' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('projectId is required');
    });

    it('calls deleteProject with projectId', async () => {
      mockDeleteProject.mockResolvedValue({ success: true });

      const tool = server.getTool('project_manage');
      const result = await tool.handler({
        action: 'delete',
        projectId: 'proj_1',
      });

      expect(mockDeleteProject).toHaveBeenCalledWith({ projectId: 'proj_1' });
      expect(result.structuredContent.success).toBe(true);
    });
  });

  describe('set_default', () => {
    it('requires projectId', async () => {
      const tool = server.getTool('project_manage');
      const result = await tool.handler({ action: 'set_default' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('projectId is required');
    });

    it('calls setDefaultProject and hints about flow_manage', async () => {
      const tool = server.getTool('project_manage');
      const result = await tool.handler({
        action: 'set_default',
        projectId: 'proj_1',
      });

      expect(mockSetDefaultProject).toHaveBeenCalledWith('proj_1');
      expect(result.structuredContent.defaultProjectId).toBe('proj_1');
      expect(result.structuredContent._hints.next).toEqual(
        expect.arrayContaining([expect.stringContaining('flow_manage')]),
      );
    });
  });

  describe('error handling', () => {
    it('catches errors and returns mcpError with auth hint', async () => {
      mockListProjects.mockRejectedValue(new Error('Unauthorized'));

      const tool = server.getTool('project_manage');
      const result = await tool.handler({ action: 'list' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Unauthorized');
      expect(parsed.hint).toContain('logged in');
    });
  });
});
