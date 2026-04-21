import { registerApiTool } from '../../tools/api.js';

jest.mock('@walkeros/cli', () => ({
  whoami: jest.fn(),
  listProjects: jest.fn(),
  getProject: jest.fn(),
  createProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  listFlows: jest.fn(),
  getFlow: jest.fn(),
  createFlow: jest.fn(),
  updateFlow: jest.fn(),
  deleteFlow: jest.fn(),
  duplicateFlow: jest.fn(),
  deploy: jest.fn(),
  getDeployment: jest.fn(),
  listDeployments: jest.fn(),
  getDeploymentBySlug: jest.fn(),
  createDeployment: jest.fn(),
  deleteDeployment: jest.fn(),
  listPreviews: jest.fn(),
  getPreview: jest.fn(),
  createPreview: jest.fn(),
  deletePreview: jest.fn(),
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
  mcpError: jest.fn((error) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
    ],
    isError: true,
  })),
}));

import {
  listPreviews,
  getPreview,
  createPreview,
  deletePreview,
} from '@walkeros/cli';

const mockExtra = {
  _meta: {},
  sendNotification: jest.fn(),
  signal: undefined,
};

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

describe('api tool — preview actions', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
    registerApiTool(server as any);
  });

  describe('preview.list', () => {
    it('requires flowId', async () => {
      const tool = server.getTool('api');
      const result = await tool.handler({ action: 'preview.list' }, mockExtra);

      expect(result.isError).toBe(true);
    });

    it('calls listPreviews with projectId and flowId', async () => {
      (listPreviews as jest.Mock).mockResolvedValue({ previews: [] });

      const tool = server.getTool('api');
      const result = await tool.handler(
        { action: 'preview.list', projectId: 'proj_1', flowId: 'cfg_1' },
        mockExtra,
      );

      expect(listPreviews).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'cfg_1',
      });
      expect(result.structuredContent.ok).toBe(true);
    });
  });

  describe('preview.get', () => {
    it('requires flowId and previewId', async () => {
      const tool = server.getTool('api');

      const r1 = await tool.handler({ action: 'preview.get' }, mockExtra);
      expect(r1.isError).toBe(true);

      const r2 = await tool.handler(
        { action: 'preview.get', flowId: 'cfg_1' },
        mockExtra,
      );
      expect(r2.isError).toBe(true);

      const r3 = await tool.handler(
        { action: 'preview.get', previewId: 'prv_1' },
        mockExtra,
      );
      expect(r3.isError).toBe(true);
    });

    it('calls getPreview with all ids', async () => {
      (getPreview as jest.Mock).mockResolvedValue({ id: 'prv_1' });

      const tool = server.getTool('api');
      const result = await tool.handler(
        {
          action: 'preview.get',
          projectId: 'proj_1',
          flowId: 'cfg_1',
          previewId: 'prv_1',
        },
        mockExtra,
      );

      expect(getPreview).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'cfg_1',
        previewId: 'prv_1',
      });
      expect(result.structuredContent.ok).toBe(true);
    });
  });

  describe('preview.create', () => {
    it('requires flowId', async () => {
      const tool = server.getTool('api');
      const result = await tool.handler(
        { action: 'preview.create', flowName: 'demo' },
        mockExtra,
      );

      expect(result.isError).toBe(true);
    });

    it('requires flowName or flowSettingsId', async () => {
      const tool = server.getTool('api');
      const result = await tool.handler(
        { action: 'preview.create', flowId: 'cfg_1' },
        mockExtra,
      );

      expect(result.isError).toBe(true);
    });

    it('without siteUrl returns activationParam only (no activationUrl, no deactivationUrl)', async () => {
      (createPreview as jest.Mock).mockResolvedValue({
        id: 'prv_1',
        token: 'tok_abc',
        activationUrl: '?elbPreview=tok_abc',
        bundleUrl: 'https://cdn.example.com/preview.js',
        createdBy: 'user_1',
        createdAt: '2026-04-21T00:00:00Z',
      });

      const tool = server.getTool('api');
      const result = await tool.handler(
        { action: 'preview.create', flowId: 'cfg_1', flowName: 'demo' },
        mockExtra,
      );

      expect(createPreview).toHaveBeenCalledWith({
        projectId: undefined,
        flowId: 'cfg_1',
        flowName: 'demo',
        flowSettingsId: undefined,
      });
      expect(result.structuredContent.ok).toBe(true);
      const data = result.structuredContent.data as Record<string, unknown>;
      expect(data.activationParam).toBe('?elbPreview=tok_abc');
      expect(data.activationUrl).toBeUndefined();
      expect(data.deactivationUrl).toBeUndefined();
    });

    it('with siteUrl returns full activationUrl and deactivationUrl', async () => {
      (createPreview as jest.Mock).mockResolvedValue({
        id: 'prv_1',
        token: 'tok_abc',
        activationUrl: '?elbPreview=tok_abc',
        bundleUrl: 'https://cdn.example.com/preview.js',
        createdBy: 'user_1',
        createdAt: '2026-04-21T00:00:00Z',
      });

      const tool = server.getTool('api');
      const result = await tool.handler(
        {
          action: 'preview.create',
          flowId: 'cfg_1',
          flowName: 'demo',
          siteUrl: 'https://example.com',
        },
        mockExtra,
      );

      expect(result.structuredContent.ok).toBe(true);
      const data = result.structuredContent.data as Record<string, unknown>;
      expect(data.activationUrl).toBe(
        'https://example.com/?elbPreview=tok_abc',
      );
      expect(data.deactivationUrl).toBe('https://example.com/?elbPreview=off');
      expect(data.activationParam).toBe('?elbPreview=tok_abc');
    });

    it('works with flowSettingsId instead of flowName', async () => {
      (createPreview as jest.Mock).mockResolvedValue({
        id: 'prv_1',
        token: 'tok_abc',
        activationUrl: '?elbPreview=tok_abc',
        bundleUrl: 'https://cdn.example.com/preview.js',
        createdBy: 'user_1',
        createdAt: '2026-04-21T00:00:00Z',
      });

      const tool = server.getTool('api');
      const result = await tool.handler(
        {
          action: 'preview.create',
          flowId: 'cfg_1',
          flowSettingsId: 'set_1',
        },
        mockExtra,
      );

      expect(createPreview).toHaveBeenCalledWith({
        projectId: undefined,
        flowId: 'cfg_1',
        flowName: undefined,
        flowSettingsId: 'set_1',
      });
      expect(result.structuredContent.ok).toBe(true);
    });
  });

  describe('preview.delete', () => {
    it('requires flowId and previewId', async () => {
      const tool = server.getTool('api');

      const r1 = await tool.handler({ action: 'preview.delete' }, mockExtra);
      expect(r1.isError).toBe(true);

      const r2 = await tool.handler(
        { action: 'preview.delete', flowId: 'cfg_1' },
        mockExtra,
      );
      expect(r2.isError).toBe(true);

      const r3 = await tool.handler(
        { action: 'preview.delete', previewId: 'prv_1' },
        mockExtra,
      );
      expect(r3.isError).toBe(true);
    });

    it('calls deletePreview with all ids', async () => {
      (deletePreview as jest.Mock).mockResolvedValue({ deleted: true });

      const tool = server.getTool('api');
      const result = await tool.handler(
        {
          action: 'preview.delete',
          projectId: 'proj_1',
          flowId: 'cfg_1',
          previewId: 'prv_1',
        },
        mockExtra,
      );

      expect(deletePreview).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'cfg_1',
        previewId: 'prv_1',
      });
      expect(result.structuredContent.ok).toBe(true);
    });
  });
});
