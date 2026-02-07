import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../api/client.js', () => ({
  apiRequest: vi.fn(),
  requireProjectId: vi.fn().mockReturnValue('proj_default'),
}));

import { apiRequest, requireProjectId } from '../../api/client.js';

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

  afterEach(() => vi.clearAllMocks());

  it('should register all 5 project tools', () => {
    expect(server.getTool('list-projects')).toBeDefined();
    expect(server.getTool('get-project')).toBeDefined();
    expect(server.getTool('create-project')).toBeDefined();
    expect(server.getTool('update-project')).toBeDefined();
    expect(server.getTool('delete-project')).toBeDefined();
  });

  describe('list-projects', () => {
    it('should call GET /api/projects', async () => {
      const mockResponse = { projects: [], total: 0 };
      vi.mocked(apiRequest).mockResolvedValue(mockResponse);
      const result = await server.getTool('list-projects').handler({});
      expect(apiRequest).toHaveBeenCalledWith('/api/projects');
      expect(result.isError).toBeUndefined();
    });
  });

  describe('get-project', () => {
    it('should use provided projectId', async () => {
      vi.mocked(apiRequest).mockResolvedValue({ id: 'proj_123' });
      await server.getTool('get-project').handler({ projectId: 'proj_123' });
      expect(apiRequest).toHaveBeenCalledWith('/api/projects/proj_123');
    });

    it('should fall back to requireProjectId()', async () => {
      vi.mocked(requireProjectId).mockReturnValue('proj_default');
      vi.mocked(apiRequest).mockResolvedValue({ id: 'proj_default' });
      await server.getTool('get-project').handler({});
      expect(requireProjectId).toHaveBeenCalled();
      expect(apiRequest).toHaveBeenCalledWith('/api/projects/proj_default');
    });
  });

  describe('create-project', () => {
    it('should POST with name', async () => {
      vi.mocked(apiRequest).mockResolvedValue({ id: 'proj_new', name: 'Test' });
      await server.getTool('create-project').handler({ name: 'Test' });
      expect(apiRequest).toHaveBeenCalledWith('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      });
    });
  });

  describe('update-project', () => {
    it('should PATCH with name', async () => {
      vi.mocked(apiRequest).mockResolvedValue({
        id: 'proj_123',
        name: 'Updated',
      });
      await server
        .getTool('update-project')
        .handler({ projectId: 'proj_123', name: 'Updated' });
      expect(apiRequest).toHaveBeenCalledWith('/api/projects/proj_123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      });
    });
  });

  describe('delete-project', () => {
    it('should send DELETE and mark as destructive', async () => {
      vi.mocked(apiRequest).mockResolvedValue({ success: true });
      const tool = server.getTool('delete-project');
      expect((tool.config as any).annotations.destructiveHint).toBe(true);
      await tool.handler({ projectId: 'proj_123' });
      expect(apiRequest).toHaveBeenCalledWith('/api/projects/proj_123', {
        method: 'DELETE',
      });
    });
  });
});
