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

import { createFlowManageToolSpec } from '../../tools/flow-manage.js';
import { stubClient } from '../support/stub-client.js';
import {
  structured,
  record,
  rows,
  hintsOf,
  textOf,
} from '../support/tool-result.js';

describe('flow_manage tool — preview actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('preview_list', () => {
    it('requires flowId', async () => {
      const spec = createFlowManageToolSpec(stubClient());
      const result = await spec.handler({ action: 'preview_list' });

      expect(record(result).isError).toBe(true);
    });

    it('calls listPreviews with projectId and flowId', async () => {
      const listPreviews = jest.fn().mockResolvedValue({ previews: [] });
      const spec = createFlowManageToolSpec(stubClient({ listPreviews }));
      const result = await spec.handler({
        action: 'preview_list',
        projectId: 'proj_1',
        flowId: 'cfg_1',
      });

      expect(listPreviews).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'cfg_1',
      });
      expect(record(result).isError).toBeUndefined();
      expect(structured(result)).toEqual({ previews: [] });
    });

    it('errors with NO_DEFAULT_PROJECT when no projectId and no default', async () => {
      const listPreviews = jest.fn();
      const spec = createFlowManageToolSpec(
        stubClient({ listPreviews, getDefaultProject: () => null }),
      );
      const result = await spec.handler({
        action: 'preview_list',
        flowId: 'cfg_1',
      });

      expect(record(result).isError).toBe(true);
      const parsed = record(JSON.parse(textOf(result)));
      expect(parsed.error).toContain('No project selected');
      expect(parsed.error).not.toContain('Project not found');
      expect(listPreviews).not.toHaveBeenCalled();
    });

    it('resolves the default project when no projectId provided', async () => {
      const listPreviews = jest.fn().mockResolvedValue({ previews: [] });
      const spec = createFlowManageToolSpec(
        stubClient({ listPreviews, getDefaultProject: () => 'proj_default' }),
      );
      await spec.handler({ action: 'preview_list', flowId: 'cfg_1' });

      expect(listPreviews).toHaveBeenCalledWith({
        projectId: 'proj_default',
        flowId: 'cfg_1',
      });
    });
  });

  describe('preview_get', () => {
    it('requires flowId and previewId', async () => {
      const spec = createFlowManageToolSpec(stubClient());

      const r1 = await spec.handler({ action: 'preview_get' });
      expect(record(r1).isError).toBe(true);

      const r2 = await spec.handler({ action: 'preview_get', flowId: 'cfg_1' });
      expect(record(r2).isError).toBe(true);

      const r3 = await spec.handler({
        action: 'preview_get',
        previewId: 'prv_1',
      });
      expect(record(r3).isError).toBe(true);
    });

    it('calls getPreview with all ids', async () => {
      const getPreview = jest.fn().mockResolvedValue({ id: 'prv_1' });
      const spec = createFlowManageToolSpec(stubClient({ getPreview }));
      const result = await spec.handler({
        action: 'preview_get',
        projectId: 'proj_1',
        flowId: 'cfg_1',
        previewId: 'prv_1',
      });

      expect(getPreview).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'cfg_1',
        previewId: 'prv_1',
      });
      expect(record(result).isError).toBeUndefined();
      expect(structured(result)).toEqual({ id: 'prv_1' });
    });
  });

  describe('preview_create', () => {
    it('requires flowId', async () => {
      const spec = createFlowManageToolSpec(stubClient());
      const result = await spec.handler({
        action: 'preview_create',
        flowName: 'demo',
      });

      expect(record(result).isError).toBe(true);
    });

    it('requires flowName or flowSettingsId', async () => {
      const spec = createFlowManageToolSpec(stubClient());
      const result = await spec.handler({
        action: 'preview_create',
        flowId: 'cfg_1',
      });

      expect(record(result).isError).toBe(true);
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
      const spec = createFlowManageToolSpec(
        stubClient({ createPreview, getDefaultProject: () => 'proj_default' }),
      );
      const result = await spec.handler({
        action: 'preview_create',
        flowId: 'cfg_1',
        flowName: 'demo',
      });

      expect(createPreview).toHaveBeenCalledWith({
        projectId: 'proj_default',
        flowId: 'cfg_1',
        flowName: 'demo',
        flowSettingsId: undefined,
      });
      expect(record(result).isError).toBeUndefined();
      const data = structured(result);
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
      const spec = createFlowManageToolSpec(
        stubClient({ createPreview, getDefaultProject: () => 'proj_default' }),
      );
      const result = await spec.handler({
        action: 'preview_create',
        flowId: 'cfg_1',
        flowName: 'demo',
        siteUrl: 'https://example.com',
      });

      // siteUrl is forwarded to the client, which mints the origin-bound grant.
      expect(createPreview).toHaveBeenCalledWith({
        projectId: 'proj_default',
        flowId: 'cfg_1',
        flowName: 'demo',
        flowSettingsId: undefined,
        siteUrl: 'https://example.com',
      });
      expect(record(result).isError).toBeUndefined();
      const data = structured(result);
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
      const spec = createFlowManageToolSpec(
        stubClient({ createPreview, getDefaultProject: () => 'proj_default' }),
      );
      const result = await spec.handler({
        action: 'preview_create',
        flowId: 'cfg_1',
        flowSettingsId: 'set_1',
        source: { kind: 'deployment-version', deploymentVersionId: 'dpv_1' },
      });

      expect(createPreview).toHaveBeenCalledWith(
        expect.objectContaining({
          flowId: 'cfg_1',
          flowSettingsId: 'set_1',
          source: { kind: 'deployment-version', deploymentVersionId: 'dpv_1' },
        }),
      );
      expect(record(result).isError).toBeUndefined();
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
      const spec = createFlowManageToolSpec(
        stubClient({ createPreview, getDefaultProject: () => 'proj_default' }),
      );
      await spec.handler({
        action: 'preview_create',
        flowId: 'cfg_1',
        flowSettingsId: 'set_1',
      });

      const callArg = record(createPreview.mock.calls[0][0]);
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
      const spec = createFlowManageToolSpec(
        stubClient({ createPreview, getDefaultProject: () => 'proj_default' }),
      );
      const result = await spec.handler({
        action: 'preview_create',
        flowId: 'cfg_1',
        flowSettingsId: 'set_1',
      });

      expect(createPreview).toHaveBeenCalledWith({
        projectId: 'proj_default',
        flowId: 'cfg_1',
        flowName: undefined,
        flowSettingsId: 'set_1',
      });
      expect(record(result).isError).toBeUndefined();
    });

    it('errors with NO_DEFAULT_PROJECT when no projectId and no default', async () => {
      const createPreview = jest.fn();
      const spec = createFlowManageToolSpec(
        stubClient({ createPreview, getDefaultProject: () => null }),
      );
      const result = await spec.handler({
        action: 'preview_create',
        flowId: 'cfg_1',
        flowName: 'demo',
      });

      expect(record(result).isError).toBe(true);
      const parsed = record(JSON.parse(textOf(result)));
      expect(parsed.error).toContain('No project selected');
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
      const spec = createFlowManageToolSpec(
        stubClient({ createPreview, getDefaultProject: () => 'proj_default' }),
      );
      await spec.handler({
        action: 'preview_create',
        projectId: 'proj_explicit',
        flowId: 'cfg_1',
        flowName: 'demo',
      });

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
      const spec = createFlowManageToolSpec(stubClient());

      const r1 = await spec.handler({ action: 'preview_delete' });
      expect(record(r1).isError).toBe(true);

      const r2 = await spec.handler({
        action: 'preview_delete',
        flowId: 'cfg_1',
      });
      expect(record(r2).isError).toBe(true);

      const r3 = await spec.handler({
        action: 'preview_delete',
        previewId: 'prv_1',
      });
      expect(record(r3).isError).toBe(true);
    });

    it('calls deletePreview with all ids', async () => {
      const deletePreview = jest.fn().mockResolvedValue({ deleted: true });
      const spec = createFlowManageToolSpec(stubClient({ deletePreview }));
      const result = await spec.handler({
        action: 'preview_delete',
        projectId: 'proj_1',
        flowId: 'cfg_1',
        previewId: 'prv_1',
      });

      expect(deletePreview).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'cfg_1',
        previewId: 'prv_1',
      });
      expect(record(result).isError).toBeUndefined();
      expect(structured(result)).toEqual({ deleted: true });
    });

    it('does not emit a null structuredContent when the client returns null (raw 204 path)', async () => {
      const deletePreview = jest.fn().mockResolvedValue(null);
      const spec = createFlowManageToolSpec(stubClient({ deletePreview }));
      const result = await spec.handler({
        action: 'preview_delete',
        projectId: 'proj_1',
        flowId: 'cfg_1',
        previewId: 'prv_1',
      });

      expect(record(result).isError).toBeUndefined();
      expect(structured(result)).not.toBeNull();
      expect(structured(result)).toEqual({
        deleted: true,
        previewId: 'prv_1',
      });
    });
  });

  describe('preview_regrant', () => {
    it('requires flowId and previewId', async () => {
      const spec = createFlowManageToolSpec(stubClient());

      const r1 = await spec.handler({ action: 'preview_regrant' });
      expect(record(r1).isError).toBe(true);

      const r2 = await spec.handler({
        action: 'preview_regrant',
        flowId: 'cfg_1',
      });
      expect(record(r2).isError).toBe(true);

      const r3 = await spec.handler({
        action: 'preview_regrant',
        previewId: 'prv_1',
      });
      expect(record(r3).isError).toBe(true);
    });

    it('errors when the client does not implement regrantPreview', async () => {
      // The default stub client omits the optional regrantPreview method (the
      // CLI-backed HTTP client is the real-world example). The handler must
      // guard on its presence rather than crash.
      const spec = createFlowManageToolSpec(
        stubClient({ getDefaultProject: () => 'proj_default' }),
      );
      const result = await spec.handler({
        action: 'preview_regrant',
        flowId: 'cfg_1',
        previewId: 'prv_1',
        origins: ['https://shop.example.com'],
      });

      expect(record(result).isError).toBe(true);
      const parsed = record(JSON.parse(textOf(result)));
      expect(parsed.error).toContain('not supported');
    });

    it('forwards ids + origins to regrantPreview and passes the redacted grant through', async () => {
      const regrantPreview = jest.fn().mockResolvedValue({
        previewId: 'prv_1',
        activationUrl: 'https://shop.example.com?elbPreview=gr_x',
        sessionExpiresAt: '2026-04-21T01:00:00Z',
      });
      const spec = createFlowManageToolSpec(
        stubClient({ regrantPreview, getDefaultProject: () => 'proj_default' }),
      );
      const result = await spec.handler({
        action: 'preview_regrant',
        flowId: 'cfg_1',
        previewId: 'prv_1',
        origins: ['https://shop.example.com'],
      });

      expect(regrantPreview).toHaveBeenCalledWith({
        projectId: 'proj_default',
        flowId: 'cfg_1',
        previewId: 'prv_1',
        origins: ['https://shop.example.com'],
      });
      expect(record(result).isError).toBeUndefined();
      const data = structured(result);
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
      const spec = createFlowManageToolSpec(
        stubClient({ regrantPreview, getDefaultProject: () => 'proj_default' }),
      );
      const result = await spec.handler({
        action: 'preview_regrant',
        flowId: 'cfg_1',
        previewId: 'prv_1',
        origins: ['https://shop.example.com'],
        sessionId: 'ses_1',
      });

      expect(regrantPreview).toHaveBeenCalledWith({
        projectId: 'proj_default',
        flowId: 'cfg_1',
        previewId: 'prv_1',
        origins: ['https://shop.example.com'],
        sessionId: 'ses_1',
      });
      expect(record(result).isError).toBeUndefined();
    });

    it('omits the sessionId key entirely when not provided', async () => {
      const regrantPreview = jest.fn().mockResolvedValue({
        previewId: 'prv_1',
        activationUrl: 'https://shop.example.com?elbPreview=gr_x',
        sessionExpiresAt: '2026-04-21T01:00:00Z',
      });
      const spec = createFlowManageToolSpec(
        stubClient({ regrantPreview, getDefaultProject: () => 'proj_default' }),
      );
      await spec.handler({
        action: 'preview_regrant',
        flowId: 'cfg_1',
        previewId: 'prv_1',
        origins: ['https://shop.example.com'],
      });

      const callArg = record(regrantPreview.mock.calls[0][0]);
      expect(Object.keys(callArg)).not.toContain('sessionId');
    });

    it('passes the observe session the mint streams into through the boundary whitelist', async () => {
      // The whitelist drops every field it does not name, so a session id the
      // API returns is invisible to the caller unless it is listed.
      const regrantPreview = jest.fn().mockResolvedValue({
        previewId: 'prv_1',
        activationUrl: 'https://shop.example.com?elbPreview=gr_x',
        sessionExpiresAt: '2026-04-21T01:00:00Z',
        sessionId: 'ses_streamed_into',
        token: 'k9x2m4p7abcd',
      });
      const spec = createFlowManageToolSpec(
        stubClient({ regrantPreview, getDefaultProject: () => 'proj_default' }),
      );
      const result = await spec.handler({
        action: 'preview_regrant',
        flowId: 'cfg_1',
        previewId: 'prv_1',
        origins: ['https://shop.example.com'],
      });

      expect(record(result).isError).toBeUndefined();
      expect(structured(result).sessionId).toBe('ses_streamed_into');
      // The whitelist still does its job around the addition.
      expect('token' in structured(result)).toBe(false);
      expect(textOf(result)).not.toContain('k9x2m4p7abcd');
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
      const spec = createFlowManageToolSpec(
        stubClient({ createPreview, getDefaultProject: () => 'proj_default' }),
      );
      const result = await spec.handler({
        action: 'preview_create',
        flowId: 'cfg_1',
        flowName: 'demo',
      });

      expect(record(result).isError).toBeUndefined();
      const data = structured(result);
      expect('token' in data).toBe(false);
      expect('projectId' in data).toBe(false);
      // The documented summary survives the whitelist.
      expect(data.id).toBe('prv_raw');
      expect(data.activationUrl).toBe(rawApiPreview.activationUrl);
      expect(data.bundleUrl).toBe(rawApiPreview.bundleUrl);
      // The token must not appear anywhere in the serialized result either.
      expect(textOf(result)).not.toContain('k9x2m4p7abcd');
      expect(textOf(result)).not.toContain('proj_secret');
    });

    it('preview_get strips token and projectId from a raw API response', async () => {
      const getPreview = jest.fn().mockResolvedValue(rawApiPreview);
      const spec = createFlowManageToolSpec(
        stubClient({ getPreview, getDefaultProject: () => 'proj_default' }),
      );
      const result = await spec.handler({
        action: 'preview_get',
        flowId: 'cfg_1',
        previewId: 'prv_raw',
      });

      expect(record(result).isError).toBeUndefined();
      expect('token' in structured(result)).toBe(false);
      expect('projectId' in structured(result)).toBe(false);
      expect(structured(result).id).toBe('prv_raw');
    });

    it('preview_list strips token and projectId from every raw list entry', async () => {
      const listPreviews = jest.fn().mockResolvedValue({
        previews: [rawApiPreview, { ...rawApiPreview, id: 'prv_raw2' }],
        total: 2,
      });
      const spec = createFlowManageToolSpec(
        stubClient({ listPreviews, getDefaultProject: () => 'proj_default' }),
      );
      const result = await spec.handler({
        action: 'preview_list',
        flowId: 'cfg_1',
      });

      expect(record(result).isError).toBeUndefined();
      expect(structured(result).total).toBe(2);
      expect(structured(result).previews).toHaveLength(2);
      for (const entry of rows(structured(result).previews)) {
        expect('token' in entry).toBe(false);
        expect('projectId' in entry).toBe(false);
      }
      expect(textOf(result)).not.toContain('k9x2m4p7abcd');
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
      const spec = createFlowManageToolSpec(
        stubClient({ regrantPreview, getDefaultProject: () => 'proj_default' }),
      );
      const result = await spec.handler({
        action: 'preview_regrant',
        flowId: 'cfg_1',
        previewId: 'prv_1',
        origins: ['https://shop.example.com'],
        sessionId: 'ses_1',
      });

      expect(record(result).isError).toBeUndefined();
      const data = structured(result);
      // Grants are deliberate outputs: the agent opens activationUrl and uses
      // sessionGrant as the X-Walkeros-Preview header for server-hop events.
      expect(data.grant).toBe('eyJ0.activ4tion.s1g');
      expect(data.sessionGrant).toBe('eyJ0.forw4rding.s1g');
      expect('token' in data).toBe(false);
      expect('projectId' in data).toBe(false);
    });
  });
});
