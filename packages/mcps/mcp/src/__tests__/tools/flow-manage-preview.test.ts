import { registerFlowManageTool } from '../../tools/flow-manage.js';

jest.mock('@walkeros/cli', () => ({
  listAllFlows: jest.fn(),
  listFlows: jest.fn(),
  getFlow: jest.fn(),
  createFlow: jest.fn(),
  updateFlow: jest.fn(),
  deleteFlow: jest.fn(),
  duplicateFlow: jest.fn(),
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
  listPreviews,
  getPreview,
  createPreview,
  deletePreview,
} from '@walkeros/cli';

const mockListPreviews = jest.mocked(listPreviews);
const mockGetPreview = jest.mocked(getPreview);
const mockCreatePreview = jest.mocked(createPreview);
const mockDeletePreview = jest.mocked(deletePreview);

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

describe('flow_manage tool — preview actions', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
    registerFlowManageTool(server as any);
  });

  describe('preview_list', () => {
    it('requires flowId', async () => {
      const tool = server.getTool('flow_manage');
      const result = await tool.handler(
        { action: 'preview_list' },
        mockExtra,
      );

      expect(result.isError).toBe(true);
    });

    it('calls listPreviews with projectId and flowId', async () => {
      mockListPreviews.mockResolvedValue({ previews: [] } as never);

      const tool = server.getTool('flow_manage');
      const result = await tool.handler(
        { action: 'preview_list', projectId: 'proj_1', flowId: 'cfg_1' },
        mockExtra,
      );

      expect(mockListPreviews).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'cfg_1',
      });
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({ previews: [] });
    });
  });

  describe('preview_get', () => {
    it('requires flowId and previewId', async () => {
      const tool = server.getTool('flow_manage');

      const r1 = await tool.handler({ action: 'preview_get' }, mockExtra);
      expect(r1.isError).toBe(true);

      const r2 = await tool.handler(
        { action: 'preview_get', flowId: 'cfg_1' },
        mockExtra,
      );
      expect(r2.isError).toBe(true);

      const r3 = await tool.handler(
        { action: 'preview_get', previewId: 'prv_1' },
        mockExtra,
      );
      expect(r3.isError).toBe(true);
    });

    it('calls getPreview with all ids', async () => {
      mockGetPreview.mockResolvedValue({ id: 'prv_1' } as never);

      const tool = server.getTool('flow_manage');
      const result = await tool.handler(
        {
          action: 'preview_get',
          projectId: 'proj_1',
          flowId: 'cfg_1',
          previewId: 'prv_1',
        },
        mockExtra,
      );

      expect(mockGetPreview).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'cfg_1',
        previewId: 'prv_1',
      });
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({ id: 'prv_1' });
    });
  });

  describe('preview_create', () => {
    it('requires flowId', async () => {
      const tool = server.getTool('flow_manage');
      const result = await tool.handler(
        { action: 'preview_create', flowName: 'demo' },
        mockExtra,
      );

      expect(result.isError).toBe(true);
    });

    it('requires flowName or flowSettingsId', async () => {
      const tool = server.getTool('flow_manage');
      const result = await tool.handler(
        { action: 'preview_create', flowId: 'cfg_1' },
        mockExtra,
      );

      expect(result.isError).toBe(true);
    });

    it('without siteUrl returns activationParam only (no activationUrl, no deactivationUrl)', async () => {
      mockCreatePreview.mockResolvedValue({
        id: 'prv_1',
        token: 'tok_abc',
        activationUrl: '?elbPreview=tok_abc',
        bundleUrl: 'https://cdn.example.com/preview.js',
        createdBy: 'user_1',
        createdAt: '2026-04-21T00:00:00Z',
      } as never);

      const tool = server.getTool('flow_manage');
      const result = await tool.handler(
        { action: 'preview_create', flowId: 'cfg_1', flowName: 'demo' },
        mockExtra,
      );

      expect(mockCreatePreview).toHaveBeenCalledWith({
        projectId: undefined,
        flowId: 'cfg_1',
        flowName: 'demo',
        flowSettingsId: undefined,
      });
      expect(result.isError).toBeUndefined();
      const data = result.structuredContent as Record<string, unknown>;
      expect(data.activationParam).toBe('?elbPreview=tok_abc');
      expect(data.activationUrl).toBeUndefined();
      expect(data.deactivationUrl).toBeUndefined();
    });

    it('with siteUrl returns full activationUrl and deactivationUrl', async () => {
      mockCreatePreview.mockResolvedValue({
        id: 'prv_1',
        token: 'tok_abc',
        activationUrl: '?elbPreview=tok_abc',
        bundleUrl: 'https://cdn.example.com/preview.js',
        createdBy: 'user_1',
        createdAt: '2026-04-21T00:00:00Z',
      } as never);

      const tool = server.getTool('flow_manage');
      const result = await tool.handler(
        {
          action: 'preview_create',
          flowId: 'cfg_1',
          flowName: 'demo',
          siteUrl: 'https://example.com',
        },
        mockExtra,
      );

      expect(result.isError).toBeUndefined();
      const data = result.structuredContent as Record<string, unknown>;
      expect(data.activationUrl).toBe(
        'https://example.com/?elbPreview=tok_abc',
      );
      expect(data.deactivationUrl).toBe('https://example.com/?elbPreview=off');
      expect(data.activationParam).toBe('?elbPreview=tok_abc');
    });

    it('works with flowSettingsId instead of flowName', async () => {
      mockCreatePreview.mockResolvedValue({
        id: 'prv_1',
        token: 'tok_abc',
        activationUrl: '?elbPreview=tok_abc',
        bundleUrl: 'https://cdn.example.com/preview.js',
        createdBy: 'user_1',
        createdAt: '2026-04-21T00:00:00Z',
      } as never);

      const tool = server.getTool('flow_manage');
      const result = await tool.handler(
        {
          action: 'preview_create',
          flowId: 'cfg_1',
          flowSettingsId: 'set_1',
        },
        mockExtra,
      );

      expect(mockCreatePreview).toHaveBeenCalledWith({
        projectId: undefined,
        flowId: 'cfg_1',
        flowName: undefined,
        flowSettingsId: 'set_1',
      });
      expect(result.isError).toBeUndefined();
    });
  });

  describe('preview_delete', () => {
    it('requires flowId and previewId', async () => {
      const tool = server.getTool('flow_manage');

      const r1 = await tool.handler({ action: 'preview_delete' }, mockExtra);
      expect(r1.isError).toBe(true);

      const r2 = await tool.handler(
        { action: 'preview_delete', flowId: 'cfg_1' },
        mockExtra,
      );
      expect(r2.isError).toBe(true);

      const r3 = await tool.handler(
        { action: 'preview_delete', previewId: 'prv_1' },
        mockExtra,
      );
      expect(r3.isError).toBe(true);
    });

    it('calls deletePreview with all ids', async () => {
      mockDeletePreview.mockResolvedValue({ deleted: true } as never);

      const tool = server.getTool('flow_manage');
      const result = await tool.handler(
        {
          action: 'preview_delete',
          projectId: 'proj_1',
          flowId: 'cfg_1',
          previewId: 'prv_1',
        },
        mockExtra,
      );

      expect(mockDeletePreview).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'cfg_1',
        previewId: 'prv_1',
      });
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({ deleted: true });
    });
  });
});
