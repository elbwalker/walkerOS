import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../api/client.js', () => ({
  apiRequest: vi.fn(),
  requireProjectId: vi.fn(),
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

describe('flow tools', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(async () => {
    server = createMockServer();
    const { registerFlowTools } = await import('../../tools/flows.js');
    registerFlowTools(server as any);
  });

  afterEach(() => vi.clearAllMocks());

  it('should register all 6 flow tools', () => {
    expect(server.getTool('list-flows')).toBeDefined();
    expect(server.getTool('get-flow')).toBeDefined();
    expect(server.getTool('create-flow')).toBeDefined();
    expect(server.getTool('update-flow')).toBeDefined();
    expect(server.getTool('delete-flow')).toBeDefined();
    expect(server.getTool('duplicate-flow')).toBeDefined();
  });

  describe('list-flows', () => {
    it('should call GET /api/projects/{projectId}/flows', async () => {
      vi.mocked(apiRequest).mockResolvedValue({ flows: [] });
      await server.getTool('list-flows').handler({ projectId: 'proj_1' });
      expect(apiRequest).toHaveBeenCalledWith('/api/projects/proj_1/flows');
    });

    it('should fall back to requireProjectId()', async () => {
      vi.mocked(requireProjectId).mockReturnValue('proj_default');
      vi.mocked(apiRequest).mockResolvedValue({ flows: [] });
      await server.getTool('list-flows').handler({});
      expect(requireProjectId).toHaveBeenCalled();
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_default/flows',
      );
    });

    it('should pass query params', async () => {
      vi.mocked(apiRequest).mockResolvedValue({ flows: [] });
      await server.getTool('list-flows').handler({
        projectId: 'proj_1',
        sort: 'name',
        order: 'asc',
        includeDeleted: true,
      });
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_1/flows?sort=name&order=asc&include_deleted=true',
      );
    });
  });

  describe('get-flow', () => {
    it('should call GET with flowId', async () => {
      vi.mocked(apiRequest).mockResolvedValue({ id: 'cfg_abc' });
      await server
        .getTool('get-flow')
        .handler({ flowId: 'cfg_abc', projectId: 'proj_1' });
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_1/flows/cfg_abc',
      );
    });

    it('should fall back to requireProjectId()', async () => {
      vi.mocked(requireProjectId).mockReturnValue('proj_default');
      vi.mocked(apiRequest).mockResolvedValue({ id: 'cfg_abc' });
      await server.getTool('get-flow').handler({ flowId: 'cfg_abc' });
      expect(requireProjectId).toHaveBeenCalled();
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_default/flows/cfg_abc',
      );
    });
  });

  describe('create-flow', () => {
    it('should POST with name and content', async () => {
      vi.mocked(apiRequest).mockResolvedValue({ id: 'cfg_new' });
      const content = { version: 1 };
      await server
        .getTool('create-flow')
        .handler({ name: 'My Flow', content, projectId: 'proj_1' });
      expect(apiRequest).toHaveBeenCalledWith('/api/projects/proj_1/flows', {
        method: 'POST',
        body: JSON.stringify({ name: 'My Flow', content }),
      });
    });
  });

  describe('update-flow', () => {
    it('should PATCH with name and content', async () => {
      vi.mocked(apiRequest).mockResolvedValue({ id: 'cfg_abc' });
      const content = { version: 1, sources: [] };
      await server.getTool('update-flow').handler({
        flowId: 'cfg_abc',
        name: 'Updated',
        content,
        projectId: 'proj_1',
      });
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_1/flows/cfg_abc',
        {
          method: 'PATCH',
          body: JSON.stringify({ name: 'Updated', content }),
        },
      );
    });

    it('should only include provided fields in body', async () => {
      vi.mocked(apiRequest).mockResolvedValue({ id: 'cfg_abc' });
      await server.getTool('update-flow').handler({
        flowId: 'cfg_abc',
        name: 'Updated',
        projectId: 'proj_1',
      });
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_1/flows/cfg_abc',
        {
          method: 'PATCH',
          body: JSON.stringify({ name: 'Updated' }),
        },
      );
    });
  });

  describe('delete-flow', () => {
    it('should send DELETE and mark as destructive', async () => {
      vi.mocked(apiRequest).mockResolvedValue({ success: true });
      const tool = server.getTool('delete-flow');
      expect((tool.config as any).annotations.destructiveHint).toBe(true);
      await tool.handler({ flowId: 'cfg_abc', projectId: 'proj_1' });
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_1/flows/cfg_abc',
        { method: 'DELETE' },
      );
    });
  });

  describe('duplicate-flow', () => {
    it('should POST to /duplicate with optional name', async () => {
      vi.mocked(apiRequest).mockResolvedValue({ id: 'cfg_copy' });
      await server.getTool('duplicate-flow').handler({
        flowId: 'cfg_abc',
        name: 'My Copy',
        projectId: 'proj_1',
      });
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_1/flows/cfg_abc/duplicate',
        {
          method: 'POST',
          body: JSON.stringify({ name: 'My Copy' }),
        },
      );
    });

    it('should POST without name when not provided', async () => {
      vi.mocked(apiRequest).mockResolvedValue({ id: 'cfg_copy' });
      await server
        .getTool('duplicate-flow')
        .handler({ flowId: 'cfg_abc', projectId: 'proj_1' });
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_1/flows/cfg_abc/duplicate',
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      );
    });
  });
});
