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
    expect(server.getTool('list-projects')).toBeDefined();
    expect(server.getTool('get-project')).toBeDefined();
    expect(server.getTool('create-project')).toBeDefined();
    expect(server.getTool('update-project')).toBeDefined();
    expect(server.getTool('delete-project')).toBeDefined();
  });

  it('has outputSchema on all tools', () => {
    const keys = (name: string) =>
      Object.keys((server.getTool(name).config as any).outputSchema ?? {});

    expect(keys('list-projects')).toEqual(Object.keys(ListProjectsOutputShape));
    expect(keys('get-project')).toEqual(Object.keys(ProjectOutputShape));
    expect(keys('create-project')).toEqual(Object.keys(ProjectOutputShape));
    expect(keys('update-project')).toEqual(Object.keys(ProjectOutputShape));
    expect(keys('delete-project')).toEqual(Object.keys(DeleteOutputShape));
  });

  describe('list-projects', () => {
    it('should call listProjects()', async () => {
      const mockResponse = { projects: [], total: 0 };
      mockListProjects.mockResolvedValue(mockResponse);
      const result = await server.getTool('list-projects').handler({});
      expect(mockListProjects).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual(mockResponse);
    });
  });

  describe('get-project', () => {
    it('should pass projectId to getProject()', async () => {
      mockGetProject.mockResolvedValue({ id: 'proj_123' });
      await server.getTool('get-project').handler({ projectId: 'proj_123' });
      expect(mockGetProject).toHaveBeenCalledWith({ projectId: 'proj_123' });
    });

    it('should pass undefined projectId when omitted', async () => {
      mockGetProject.mockResolvedValue({ id: 'proj_default' });
      await server.getTool('get-project').handler({});
      expect(mockGetProject).toHaveBeenCalledWith({ projectId: undefined });
    });
  });

  describe('create-project', () => {
    it('should pass name to createProject()', async () => {
      mockCreateProject.mockResolvedValue({ id: 'proj_new', name: 'Test' });
      await server.getTool('create-project').handler({ name: 'Test' });
      expect(mockCreateProject).toHaveBeenCalledWith({ name: 'Test' });
    });
  });

  describe('update-project', () => {
    it('should pass projectId and name to updateProject()', async () => {
      mockUpdateProject.mockResolvedValue({
        id: 'proj_123',
        name: 'Updated',
      });
      await server
        .getTool('update-project')
        .handler({ projectId: 'proj_123', name: 'Updated' });
      expect(mockUpdateProject).toHaveBeenCalledWith({
        projectId: 'proj_123',
        name: 'Updated',
      });
    });
  });

  describe('delete-project', () => {
    it('should pass projectId to deleteProject() and mark as destructive', async () => {
      mockDeleteProject.mockResolvedValue({ success: true });
      const tool = server.getTool('delete-project');
      expect((tool.config as any).annotations.destructiveHint).toBe(true);
      await tool.handler({ projectId: 'proj_123' });
      expect(mockDeleteProject).toHaveBeenCalledWith({
        projectId: 'proj_123',
      });
    });
  });
});
