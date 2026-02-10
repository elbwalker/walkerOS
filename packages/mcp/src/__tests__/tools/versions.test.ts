const mockApiRequest = jest.fn();
const mockRequireProjectId = jest.fn();

jest.mock('@walkeros/cli', () => ({
  apiRequest: mockApiRequest,
  requireProjectId: mockRequireProjectId,
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

describe('version tools', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(async () => {
    server = createMockServer();
    const { registerVersionTools } = await import('../../tools/versions.js');
    registerVersionTools(server as any);
  });

  afterEach(() => jest.clearAllMocks());

  it('should register all 3 version tools', () => {
    expect(server.getTool('list-versions')).toBeDefined();
    expect(server.getTool('get-version')).toBeDefined();
    expect(server.getTool('restore-version')).toBeDefined();
  });

  describe('list-versions', () => {
    it('should call GET with flowId and projectId', async () => {
      mockApiRequest.mockResolvedValue({ versions: [] });
      await server
        .getTool('list-versions')
        .handler({ flowId: 'cfg_abc', projectId: 'proj_1' });
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_1/flows/cfg_abc/versions',
      );
    });

    it('should fall back to requireProjectId()', async () => {
      mockRequireProjectId.mockReturnValue('proj_default');
      mockApiRequest.mockResolvedValue({ versions: [] });
      await server.getTool('list-versions').handler({ flowId: 'cfg_abc' });
      expect(mockRequireProjectId).toHaveBeenCalled();
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_default/flows/cfg_abc/versions',
      );
    });
  });

  describe('get-version', () => {
    it('should call GET with version number', async () => {
      mockApiRequest.mockResolvedValue({ version: 3 });
      await server
        .getTool('get-version')
        .handler({ flowId: 'cfg_abc', version: 3, projectId: 'proj_1' });
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_1/flows/cfg_abc/versions/3',
      );
    });

    it('should have readOnly annotations', () => {
      const tool = server.getTool('get-version');
      expect((tool.config as any).annotations.readOnlyHint).toBe(true);
      expect((tool.config as any).annotations.idempotentHint).toBe(true);
    });
  });

  describe('restore-version', () => {
    it('should POST to /restore', async () => {
      mockApiRequest.mockResolvedValue({ success: true });
      await server.getTool('restore-version').handler({
        flowId: 'cfg_abc',
        version: 2,
        projectId: 'proj_1',
      });
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_1/flows/cfg_abc/versions/2/restore',
        { method: 'POST' },
      );
    });

    it('should not be marked as destructive', () => {
      const tool = server.getTool('restore-version');
      expect((tool.config as any).annotations.readOnlyHint).toBe(false);
      expect((tool.config as any).annotations.destructiveHint).toBe(false);
    });
  });
});
