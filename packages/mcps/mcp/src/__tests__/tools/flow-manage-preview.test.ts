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

    it('errors with NO_DEFAULT_PROJECT when no projectId and no default', async () => {
      const listPreviews = jest.fn();
      registerFlowManageTool(
        server as never,
        stubClient({ listPreviews, getDefaultProject: () => null }),
      );

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler(
        { action: 'preview_list', flowId: 'cfg_1' },
        mockExtra,
      )) as { isError: boolean; content: Array<{ text: string }> };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('No default project set');
      expect(parsed.error).not.toContain('Project not found');
      expect(listPreviews).not.toHaveBeenCalled();
    });

    it('resolves the default project when no projectId provided', async () => {
      const listPreviews = jest.fn().mockResolvedValue({ previews: [] });
      registerFlowManageTool(
        server as never,
        stubClient({ listPreviews, getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('flow_manage')!;
      await tool.handler(
        { action: 'preview_list', flowId: 'cfg_1' },
        mockExtra,
      );

      expect(listPreviews).toHaveBeenCalledWith({
        projectId: 'proj_default',
        flowId: 'cfg_1',
      });
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

    it("surfaces the client's redacted summary and synthesizes no token URL", async () => {
      // The client returns an already-redacted preview summary (no token, no
      // projectId). The handler passes it through verbatim and adds no
      // token-derived activationParam/deactivationUrl of its own.
      const createPreview = jest.fn().mockResolvedValue({
        previewId: 'prv_1',
        flowId: 'cfg_1',
        bundleUrl: 'https://cdn.example.com/preview/art_x.js',
        activationUrl: null,
        sessionExpiresAt: null,
        status: 'arming',
        createdAt: '2026-04-21T00:00:00Z',
        observeFeed: { tool: 'observe_journeys', flowId: 'cfg_1' },
      });
      registerFlowManageTool(
        server as never,
        stubClient({ createPreview, getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler(
        { action: 'preview_create', flowId: 'cfg_1', flowName: 'demo' },
        mockExtra,
      )) as { isError?: boolean; structuredContent: Record<string, unknown> };

      expect(createPreview).toHaveBeenCalledWith({
        projectId: 'proj_default',
        flowId: 'cfg_1',
        flowName: 'demo',
        flowSettingsId: undefined,
      });
      expect(result.isError).toBeUndefined();
      const data = result.structuredContent;
      expect(data.previewId).toBe('prv_1');
      expect(data.activationUrl).toBeNull();
      expect(data.activationParam).toBeUndefined();
      expect(data.deactivationUrl).toBeUndefined();
      expect('token' in data).toBe(false);
    });

    it('forwards siteUrl to the client and passes the grant-based activationUrl through unchanged', async () => {
      const createPreview = jest.fn().mockResolvedValue({
        previewId: 'prv_1',
        flowId: 'cfg_1',
        bundleUrl: 'https://cdn.example.com/preview/art_x.js',
        activationUrl: 'https://example.com?elbPreview=gr_signedgrant',
        sessionExpiresAt: '2026-04-21T01:00:00Z',
        status: 'live',
        createdAt: '2026-04-21T00:00:00Z',
        observeFeed: { tool: 'observe_journeys', flowId: 'cfg_1' },
      });
      registerFlowManageTool(
        server as never,
        stubClient({ createPreview, getDefaultProject: () => 'proj_default' }),
      );

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

      // siteUrl is forwarded to the client, which mints the origin-bound grant.
      expect(createPreview).toHaveBeenCalledWith({
        projectId: 'proj_default',
        flowId: 'cfg_1',
        flowName: 'demo',
        flowSettingsId: undefined,
        siteUrl: 'https://example.com',
      });
      expect(result.isError).toBeUndefined();
      const data = result.structuredContent;
      // Grant-based activationUrl passed through verbatim; the handler never
      // rebuilds it from a token, and never emits a deactivationUrl.
      expect(data.activationUrl).toBe(
        'https://example.com?elbPreview=gr_signedgrant',
      );
      expect(data.deactivationUrl).toBeUndefined();
      expect(data.activationParam).toBeUndefined();
    });

    it('forwards source to createPreview when provided', async () => {
      const createPreview = jest.fn().mockResolvedValue({
        id: 'prv_1',
        token: 'tok_abc',
        activationUrl: '?elbPreview=tok_abc',
        bundleUrl: 'https://cdn.example.com/preview.js',
        createdBy: 'user_1',
        createdAt: '2026-04-21T00:00:00Z',
      });
      registerFlowManageTool(
        server as never,
        stubClient({ createPreview, getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler(
        {
          action: 'preview_create',
          flowId: 'cfg_1',
          flowSettingsId: 'set_1',
          source: { kind: 'deployment-version', deploymentVersionId: 'dpv_1' },
        },
        mockExtra,
      )) as { isError?: boolean };

      expect(createPreview).toHaveBeenCalledWith(
        expect.objectContaining({
          flowId: 'cfg_1',
          flowSettingsId: 'set_1',
          source: { kind: 'deployment-version', deploymentVersionId: 'dpv_1' },
        }),
      );
      expect(result.isError).toBeUndefined();
    });

    it('omits source from the createPreview call when not provided', async () => {
      const createPreview = jest.fn().mockResolvedValue({
        id: 'prv_1',
        token: 'tok_abc',
        activationUrl: '?elbPreview=tok_abc',
        bundleUrl: 'https://cdn.example.com/preview.js',
        createdBy: 'user_1',
        createdAt: '2026-04-21T00:00:00Z',
      });
      registerFlowManageTool(
        server as never,
        stubClient({ createPreview, getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('flow_manage')!;
      await tool.handler(
        { action: 'preview_create', flowId: 'cfg_1', flowSettingsId: 'set_1' },
        mockExtra,
      );

      const callArg = createPreview.mock.calls[0][0] as Record<string, unknown>;
      expect(Object.keys(callArg)).not.toContain('source');
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
      registerFlowManageTool(
        server as never,
        stubClient({ createPreview, getDefaultProject: () => 'proj_default' }),
      );

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
        projectId: 'proj_default',
        flowId: 'cfg_1',
        flowName: undefined,
        flowSettingsId: 'set_1',
      });
      expect(result.isError).toBeUndefined();
    });

    it('errors with NO_DEFAULT_PROJECT when no projectId and no default', async () => {
      const createPreview = jest.fn();
      registerFlowManageTool(
        server as never,
        stubClient({ createPreview, getDefaultProject: () => null }),
      );

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler(
        { action: 'preview_create', flowId: 'cfg_1', flowName: 'demo' },
        mockExtra,
      )) as { isError: boolean; content: Array<{ text: string }> };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('No default project set');
      expect(parsed.error).not.toContain('Project not found');
      expect(createPreview).not.toHaveBeenCalled();
    });

    it('explicit projectId wins over the default and is passed through', async () => {
      const createPreview = jest.fn().mockResolvedValue({
        id: 'prv_1',
        token: 'tok_abc',
        activationUrl: '?elbPreview=tok_abc',
        bundleUrl: 'https://cdn.example.com/preview.js',
        createdBy: 'user_1',
        createdAt: '2026-04-21T00:00:00Z',
      });
      registerFlowManageTool(
        server as never,
        stubClient({ createPreview, getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('flow_manage')!;
      await tool.handler(
        {
          action: 'preview_create',
          projectId: 'proj_explicit',
          flowId: 'cfg_1',
          flowName: 'demo',
        },
        mockExtra,
      );

      expect(createPreview).toHaveBeenCalledWith({
        projectId: 'proj_explicit',
        flowId: 'cfg_1',
        flowName: 'demo',
        flowSettingsId: undefined,
      });
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

    it('does not emit a null structuredContent when the client returns null (raw 204 path)', async () => {
      const deletePreview = jest.fn().mockResolvedValue(null);
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

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).not.toBeNull();
      expect(result.structuredContent).toEqual({
        deleted: true,
        previewId: 'prv_1',
      });
    });
  });

  describe('preview_regrant', () => {
    it('requires flowId and previewId', async () => {
      registerFlowManageTool(server as never, stubClient());
      const tool = server.getTool('flow_manage')!;

      const r1 = (await tool.handler(
        { action: 'preview_regrant' },
        mockExtra,
      )) as { isError: boolean };
      expect(r1.isError).toBe(true);

      const r2 = (await tool.handler(
        { action: 'preview_regrant', flowId: 'cfg_1' },
        mockExtra,
      )) as { isError: boolean };
      expect(r2.isError).toBe(true);

      const r3 = (await tool.handler(
        { action: 'preview_regrant', previewId: 'prv_1' },
        mockExtra,
      )) as { isError: boolean };
      expect(r3.isError).toBe(true);
    });

    it('errors when the client does not implement regrantPreview', async () => {
      // The default stub client omits the optional regrantPreview method (the
      // CLI-backed HTTP client is the real-world example). The handler must
      // guard on its presence rather than crash.
      registerFlowManageTool(
        server as never,
        stubClient({ getDefaultProject: () => 'proj_default' }),
      );
      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler(
        {
          action: 'preview_regrant',
          flowId: 'cfg_1',
          previewId: 'prv_1',
          origins: ['https://shop.example.com'],
        },
        mockExtra,
      )) as { isError: boolean; content: Array<{ text: string }> };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('not supported');
    });

    it('forwards ids + origins to regrantPreview and passes the redacted grant through', async () => {
      const regrantPreview = jest.fn().mockResolvedValue({
        previewId: 'prv_1',
        activationUrl: 'https://shop.example.com?elbPreview=gr_x',
        sessionExpiresAt: '2026-04-21T01:00:00Z',
      });
      registerFlowManageTool(
        server as never,
        stubClient({ regrantPreview, getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler(
        {
          action: 'preview_regrant',
          flowId: 'cfg_1',
          previewId: 'prv_1',
          origins: ['https://shop.example.com'],
        },
        mockExtra,
      )) as { isError?: boolean; structuredContent: Record<string, unknown> };

      expect(regrantPreview).toHaveBeenCalledWith({
        projectId: 'proj_default',
        flowId: 'cfg_1',
        previewId: 'prv_1',
        origins: ['https://shop.example.com'],
      });
      expect(result.isError).toBeUndefined();
      const data = result.structuredContent;
      expect(data.activationUrl).toBe(
        'https://shop.example.com?elbPreview=gr_x',
      );
      expect('token' in data).toBe(false);
      expect('projectId' in data).toBe(false);
    });

    it('threads sessionId into regrantPreview when provided', async () => {
      const regrantPreview = jest.fn().mockResolvedValue({
        previewId: 'prv_1',
        activationUrl: 'https://shop.example.com?elbPreview=gr_x',
        sessionExpiresAt: '2026-04-21T01:00:00Z',
      });
      registerFlowManageTool(
        server as never,
        stubClient({ regrantPreview, getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler(
        {
          action: 'preview_regrant',
          flowId: 'cfg_1',
          previewId: 'prv_1',
          origins: ['https://shop.example.com'],
          sessionId: 'ses_1',
        },
        mockExtra,
      )) as { isError?: boolean };

      expect(regrantPreview).toHaveBeenCalledWith({
        projectId: 'proj_default',
        flowId: 'cfg_1',
        previewId: 'prv_1',
        origins: ['https://shop.example.com'],
        sessionId: 'ses_1',
      });
      expect(result.isError).toBeUndefined();
    });

    it('omits the sessionId key entirely when not provided', async () => {
      const regrantPreview = jest.fn().mockResolvedValue({
        previewId: 'prv_1',
        activationUrl: 'https://shop.example.com?elbPreview=gr_x',
        sessionExpiresAt: '2026-04-21T01:00:00Z',
      });
      registerFlowManageTool(
        server as never,
        stubClient({ regrantPreview, getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('flow_manage')!;
      await tool.handler(
        {
          action: 'preview_regrant',
          flowId: 'cfg_1',
          previewId: 'prv_1',
          origins: ['https://shop.example.com'],
        },
        mockExtra,
      );

      const callArg = regrantPreview.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(Object.keys(callArg)).not.toContain('sessionId');
    });
  });

  describe('preview response redaction (boundary whitelist)', () => {
    // The CLI-backed HTTP client returns the raw API response, which carries
    // the ingest token and project id. The handler must whitelist fields at
    // the MCP boundary — results end up in agent transcripts and logs.
    const rawApiPreview = {
      id: 'prv_raw',
      flowId: 'cfg_1',
      flowSettingsId: 'fs_a',
      projectId: 'proj_secret',
      token: 'k9x2m4p7abcd',
      bundleUrl: 'https://cdn/preview/art_x.js',
      activationUrl: 'https://shop.example.com?elbPreview=gr_signed',
      createdBy: 'user_alex',
      createdAt: '2026-04-21T00:00:00Z',
    };

    it('preview_create strips token and projectId from a raw API response', async () => {
      const createPreview = jest.fn().mockResolvedValue(rawApiPreview);
      registerFlowManageTool(
        server as never,
        stubClient({ createPreview, getDefaultProject: () => 'proj_default' }),
      );
      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler(
        { action: 'preview_create', flowId: 'cfg_1', flowName: 'demo' },
        mockExtra,
      )) as {
        isError?: boolean;
        structuredContent: Record<string, unknown>;
        content: Array<{ text: string }>;
      };

      expect(result.isError).toBeUndefined();
      const data = result.structuredContent;
      expect('token' in data).toBe(false);
      expect('projectId' in data).toBe(false);
      // The documented summary survives the whitelist.
      expect(data.id).toBe('prv_raw');
      expect(data.activationUrl).toBe(rawApiPreview.activationUrl);
      expect(data.bundleUrl).toBe(rawApiPreview.bundleUrl);
      // The token must not appear anywhere in the serialized result either.
      expect(result.content[0].text).not.toContain('k9x2m4p7abcd');
      expect(result.content[0].text).not.toContain('proj_secret');
    });

    it('preview_get strips token and projectId from a raw API response', async () => {
      const getPreview = jest.fn().mockResolvedValue(rawApiPreview);
      registerFlowManageTool(server as never, stubClient({ getPreview }));
      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler(
        { action: 'preview_get', flowId: 'cfg_1', previewId: 'prv_raw' },
        mockExtra,
      )) as { isError?: boolean; structuredContent: Record<string, unknown> };

      expect(result.isError).toBeUndefined();
      expect('token' in result.structuredContent).toBe(false);
      expect('projectId' in result.structuredContent).toBe(false);
      expect(result.structuredContent.id).toBe('prv_raw');
    });

    it('preview_list strips token and projectId from every raw list entry', async () => {
      const listPreviews = jest.fn().mockResolvedValue({
        previews: [rawApiPreview, { ...rawApiPreview, id: 'prv_raw2' }],
        total: 2,
      });
      registerFlowManageTool(
        server as never,
        stubClient({ listPreviews, getDefaultProject: () => 'proj_default' }),
      );
      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler(
        { action: 'preview_list', flowId: 'cfg_1' },
        mockExtra,
      )) as {
        isError?: boolean;
        structuredContent: {
          previews: Array<Record<string, unknown>>;
          total: number;
        };
        content: Array<{ text: string }>;
      };

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent.total).toBe(2);
      expect(result.structuredContent.previews).toHaveLength(2);
      for (const entry of result.structuredContent.previews) {
        expect('token' in entry).toBe(false);
        expect('projectId' in entry).toBe(false);
      }
      expect(result.content[0].text).not.toContain('k9x2m4p7abcd');
    });

    it('preview_regrant strips the token but keeps the grant pair the caller needs', async () => {
      const regrantPreview = jest.fn().mockResolvedValue({
        grant: 'eyJ0.activ4tion.s1g',
        sessionGrant: 'eyJ0.forw4rding.s1g',
        activationUrl:
          'https://shop.example.com?elbPreview=eyJ0.activ4tion.s1g&elbPreviewSession=eyJ0.forw4rding.s1g',
        sessionExpiresAt: '2026-04-21T01:00:00Z',
        token: 'k9x2m4p7abcd',
        projectId: 'proj_secret',
      });
      registerFlowManageTool(
        server as never,
        stubClient({ regrantPreview, getDefaultProject: () => 'proj_default' }),
      );
      const tool = server.getTool('flow_manage')!;
      const result = (await tool.handler(
        {
          action: 'preview_regrant',
          flowId: 'cfg_1',
          previewId: 'prv_1',
          origins: ['https://shop.example.com'],
          sessionId: 'ses_1',
        },
        mockExtra,
      )) as { isError?: boolean; structuredContent: Record<string, unknown> };

      expect(result.isError).toBeUndefined();
      const data = result.structuredContent;
      // Grants are deliberate outputs: the agent opens activationUrl and uses
      // sessionGrant as the X-Walkeros-Preview header for server-hop events.
      expect(data.grant).toBe('eyJ0.activ4tion.s1g');
      expect(data.sessionGrant).toBe('eyJ0.forw4rding.s1g');
      expect('token' in data).toBe(false);
      expect('projectId' in data).toBe(false);
    });
  });
});
