import {
  ListProjectsOutputShape,
  ProjectOutputShape,
  DeleteOutputShape,
} from '../../schemas/output.js';

const mockListProjects = jest.fn();
const mockGetProject = jest.fn();
const mockCreateProject = jest.fn();
const mockUpdateProject = jest.fn();
const mockDeleteProject = jest.fn();

jest.mock('@walkeros/cli', () => ({
  listProjects: mockListProjects,
  getProject: mockGetProject,
  createProject: mockCreateProject,
  updateProject: mockUpdateProject,
  deleteProject: mockDeleteProject,
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

describe('project tools', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(async () => {
    server = createMockServer();
    const { registerProjectTools } = await import('../../tools/projects.js');
    registerProjectTools(server as any);
  });

  afterEach(() => jest.clearAllMocks());

  it('should register all 5 project tools', () => {
    expect(server.getTool('project_list')).toBeDefined();
    expect(server.getTool('project_get')).toBeDefined();
    expect(server.getTool('project_create')).toBeDefined();
    expect(server.getTool('project_update')).toBeDefined();
    expect(server.getTool('project_delete')).toBeDefined();
  });

  it('has outputSchema on all tools', () => {
    const keys = (name: string) =>
      Object.keys((server.getTool(name).config as any).outputSchema ?? {});

    expect(keys('project_list')).toEqual(Object.keys(ListProjectsOutputShape));
    expect(keys('project_get')).toEqual(Object.keys(ProjectOutputShape));
    expect(keys('project_create')).toEqual(Object.keys(ProjectOutputShape));
    expect(keys('project_update')).toEqual(Object.keys(ProjectOutputShape));
    expect(keys('project_delete')).toEqual(Object.keys(DeleteOutputShape));
  });

  describe('project_list', () => {
    it('should call listProjects()', async () => {
      const mockResponse = { projects: [], total: 0 };
      mockListProjects.mockResolvedValue(mockResponse);
      const result = await server.getTool('project_list').handler({});
      expect(mockListProjects).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual(mockResponse);
    });
  });

  describe('project_get', () => {
    it('should pass projectId to getProject()', async () => {
      mockGetProject.mockResolvedValue({ id: 'proj_123' });
      await server.getTool('project_get').handler({ projectId: 'proj_123' });
      expect(mockGetProject).toHaveBeenCalledWith({ projectId: 'proj_123' });
    });

    it('should pass undefined projectId when omitted', async () => {
      mockGetProject.mockResolvedValue({ id: 'proj_default' });
      await server.getTool('project_get').handler({});
      expect(mockGetProject).toHaveBeenCalledWith({ projectId: undefined });
    });
  });

  describe('project_create', () => {
    it('should pass name to createProject()', async () => {
      mockCreateProject.mockResolvedValue({ id: 'proj_new', name: 'Test' });
      await server.getTool('project_create').handler({ name: 'Test' });
      expect(mockCreateProject).toHaveBeenCalledWith({ name: 'Test' });
    });
  });

  describe('project_update', () => {
    it('should have idempotentHint true', () => {
      const tool = server.getTool('project_update');
      expect((tool.config as any).annotations.idempotentHint).toBe(true);
    });

    it('should pass projectId and name to updateProject()', async () => {
      mockUpdateProject.mockResolvedValue({
        id: 'proj_123',
        name: 'Updated',
      });
      await server
        .getTool('project_update')
        .handler({ projectId: 'proj_123', name: 'Updated' });
      expect(mockUpdateProject).toHaveBeenCalledWith({
        projectId: 'proj_123',
        name: 'Updated',
      });
    });
  });

  describe('project_delete', () => {
    it('should have idempotentHint true', () => {
      const tool = server.getTool('project_delete');
      expect((tool.config as any).annotations.idempotentHint).toBe(true);
    });

    it('should pass projectId to deleteProject() and mark as destructive', async () => {
      mockDeleteProject.mockResolvedValue({ success: true });
      const tool = server.getTool('project_delete');
      expect((tool.config as any).annotations.destructiveHint).toBe(true);
      await tool.handler({ projectId: 'proj_123' });
      expect(mockDeleteProject).toHaveBeenCalledWith({
        projectId: 'proj_123',
      });
    });
  });
});
