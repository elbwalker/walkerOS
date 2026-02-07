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

describe('version tools', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(async () => {
    server = createMockServer();
    const { registerVersionTools } = await import('../../tools/versions.js');
    registerVersionTools(server as any);
  });

  afterEach(() => vi.clearAllMocks());

  it('should register all 3 version tools', () => {
    expect(server.getTool('list-versions')).toBeDefined();
    expect(server.getTool('get-version')).toBeDefined();
    expect(server.getTool('restore-version')).toBeDefined();
  });

  describe('list-versions', () => {
    it('should call GET with flowId and projectId', async () => {
      vi.mocked(apiRequest).mockResolvedValue({ versions: [] });
      await server
        .getTool('list-versions')
        .handler({ flowId: 'cfg_abc', projectId: 'proj_1' });
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_1/flows/cfg_abc/versions',
      );
    });

    it('should fall back to requireProjectId()', async () => {
      vi.mocked(requireProjectId).mockReturnValue('proj_default');
      vi.mocked(apiRequest).mockResolvedValue({ versions: [] });
      await server.getTool('list-versions').handler({ flowId: 'cfg_abc' });
      expect(requireProjectId).toHaveBeenCalled();
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_default/flows/cfg_abc/versions',
      );
    });
  });

  describe('get-version', () => {
    it('should call GET with version number', async () => {
      vi.mocked(apiRequest).mockResolvedValue({ version: 3 });
      await server
        .getTool('get-version')
        .handler({ flowId: 'cfg_abc', version: 3, projectId: 'proj_1' });
      expect(apiRequest).toHaveBeenCalledWith(
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
      vi.mocked(apiRequest).mockResolvedValue({ success: true });
      await server.getTool('restore-version').handler({
        flowId: 'cfg_abc',
        version: 2,
        projectId: 'proj_1',
      });
      expect(apiRequest).toHaveBeenCalledWith(
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
