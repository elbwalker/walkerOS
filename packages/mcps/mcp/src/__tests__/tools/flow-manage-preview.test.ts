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

import { registerFlowManageTool } from '../../tools/flow-manage.js';
import { stubClient } from '../support/stub-client.js';

const mockExtra = {
  _meta: {},
  sendNotification: jest.fn(),
  signal: undefined,
};

type HandlerFn = (
  input: Record<string, unknown>,
  extra?: unknown,
) => Promise<unknown>;

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

describe('flow_manage tool — preview actions', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
  });

  describe('preview_list', () => {
    it('requires flowId', async () => {
      registerFlowManageTool(server as never, stubClient());
      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler(
        { action: 'preview_list' },
        mockExtra,
      )) as { isError: boolean };

      expect(result.isError).toBe(true);
    });

    it('calls listPreviews with projectId and flowId', async () => {
      const listPreviews = jest.fn().mockResolvedValue({ previews: [] });
      registerFlowManageTool(server as never, stubClient({ listPreviews }));

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler(
        { action: 'preview_list', projectId: 'proj_1', flowId: 'cfg_1' },
        mockExtra,
      )) as { isError?: boolean; structuredContent: unknown };

      expect(listPreviews).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'cfg_1',
      });
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({ previews: [] });
    });
  });

  describe('preview_get', () => {
    it('requires flowId and previewId', async () => {
      registerFlowManageTool(server as never, stubClient());
      const tool = server.getTool('flow_manage')!;

      const r1 = (await tool.handler({ action: 'preview_get' }, mockExtra)) as {
        isError: boolean;
      };
      expect(r1.isError).toBe(true);

      const r2 = (await tool.handler(
        { action: 'preview_get', flowId: 'cfg_1' },
        mockExtra,
      )) as { isError: boolean };
      expect(r2.isError).toBe(true);

      const r3 = (await tool.handler(
        { action: 'preview_get', previewId: 'prv_1' },
        mockExtra,
      )) as { isError: boolean };
      expect(r3.isError).toBe(true);
    });

    it('calls getPreview with all ids', async () => {
      const getPreview = jest.fn().mockResolvedValue({ id: 'prv_1' });
      registerFlowManageTool(server as never, stubClient({ getPreview }));

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler(
        {
          action: 'preview_get',
          projectId: 'proj_1',
          flowId: 'cfg_1',
          previewId: 'prv_1',
        },
        mockExtra,
      )) as { isError?: boolean; structuredContent: unknown };

      expect(getPreview).toHaveBeenCalledWith({
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
      registerFlowManageTool(server as never, stubClient());
      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler(
        { action: 'preview_create', flowName: 'demo' },
        mockExtra,
      )) as { isError: boolean };

      expect(result.isError).toBe(true);
    });

    it('requires flowName or flowSettingsId', async () => {
      registerFlowManageTool(server as never, stubClient());
      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler(
        { action: 'preview_create', flowId: 'cfg_1' },
        mockExtra,
      )) as { isError: boolean };

      expect(result.isError).toBe(true);
    });

    it('without siteUrl returns activationParam only (no activationUrl, no deactivationUrl)', async () => {
      const createPreview = jest.fn().mockResolvedValue({
        id: 'prv_1',
        token: 'tok_abc',
        activationUrl: '?elbPreview=tok_abc',
        bundleUrl: 'https://cdn.example.com/preview.js',
        createdBy: 'user_1',
        createdAt: '2026-04-21T00:00:00Z',
      });
      registerFlowManageTool(server as never, stubClient({ createPreview }));

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler(
        { action: 'preview_create', flowId: 'cfg_1', flowName: 'demo' },
        mockExtra,
      )) as { isError?: boolean; structuredContent: Record<string, unknown> };

      expect(createPreview).toHaveBeenCalledWith({
        projectId: undefined,
        flowId: 'cfg_1',
        flowName: 'demo',
        flowSettingsId: undefined,
      });
      expect(result.isError).toBeUndefined();
      const data = result.structuredContent;
      expect(data.activationParam).toBe('?elbPreview=tok_abc');
      expect(data.activationUrl).toBeUndefined();
      expect(data.deactivationUrl).toBeUndefined();
    });

    it('with siteUrl returns full activationUrl and deactivationUrl', async () => {
      const createPreview = jest.fn().mockResolvedValue({
        id: 'prv_1',
        token: 'tok_abc',
        activationUrl: '?elbPreview=tok_abc',
        bundleUrl: 'https://cdn.example.com/preview.js',
        createdBy: 'user_1',
        createdAt: '2026-04-21T00:00:00Z',
      });
      registerFlowManageTool(server as never, stubClient({ createPreview }));

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler(
        {
          action: 'preview_create',
          flowId: 'cfg_1',
          flowName: 'demo',
          siteUrl: 'https://example.com',
        },
        mockExtra,
      )) as { isError?: boolean; structuredContent: Record<string, unknown> };

      expect(result.isError).toBeUndefined();
      const data = result.structuredContent;
      expect(data.activationUrl).toBe(
        'https://example.com/?elbPreview=tok_abc',
      );
      expect(data.deactivationUrl).toBe('https://example.com/?elbPreview=off');
      expect(data.activationParam).toBe('?elbPreview=tok_abc');
    });

    it('works with flowSettingsId instead of flowName', async () => {
      const createPreview = jest.fn().mockResolvedValue({
        id: 'prv_1',
        token: 'tok_abc',
        activationUrl: '?elbPreview=tok_abc',
        bundleUrl: 'https://cdn.example.com/preview.js',
        createdBy: 'user_1',
        createdAt: '2026-04-21T00:00:00Z',
      });
      registerFlowManageTool(server as never, stubClient({ createPreview }));

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler(
        {
          action: 'preview_create',
          flowId: 'cfg_1',
          flowSettingsId: 'set_1',
        },
        mockExtra,
      )) as { isError?: boolean };

      expect(createPreview).toHaveBeenCalledWith({
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
      registerFlowManageTool(server as never, stubClient());
      const tool = server.getTool('flow_manage')!;

      const r1 = (await tool.handler(
        { action: 'preview_delete' },
        mockExtra,
      )) as { isError: boolean };
      expect(r1.isError).toBe(true);

      const r2 = (await tool.handler(
        { action: 'preview_delete', flowId: 'cfg_1' },
        mockExtra,
      )) as { isError: boolean };
      expect(r2.isError).toBe(true);

      const r3 = (await tool.handler(
        { action: 'preview_delete', previewId: 'prv_1' },
        mockExtra,
      )) as { isError: boolean };
      expect(r3.isError).toBe(true);
    });

    it('calls deletePreview with all ids', async () => {
      const deletePreview = jest.fn().mockResolvedValue({ deleted: true });
      registerFlowManageTool(server as never, stubClient({ deletePreview }));

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler(
        {
          action: 'preview_delete',
          projectId: 'proj_1',
          flowId: 'cfg_1',
          previewId: 'prv_1',
        },
        mockExtra,
      )) as { isError?: boolean; structuredContent: unknown };

      expect(deletePreview).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'cfg_1',
        previewId: 'prv_1',
      });
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({ deleted: true });
    });
  });
});
