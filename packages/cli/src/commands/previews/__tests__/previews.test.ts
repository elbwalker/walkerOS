import { requireProjectId } from '../../../core/auth.js';
import { apiFetch } from '../../../core/http.js';
import { getFlow } from '../../flows/index.js';
import {
  listPreviews,
  getPreview,
  createPreview,
  deletePreview,
  regrantPreview,
} from '../index.js';

jest.mock('../../../core/auth.js', () => ({
  ...jest.requireActual('../../../core/auth.js'),
  requireProjectId: jest.fn().mockReturnValue('proj_default'),
}));
jest.mock('../../../core/http.js', () => ({
  apiFetch: jest.fn(),
}));
jest.mock('../../flows/index.js', () => ({
  getFlow: jest.fn(),
}));

const mockApiFetch = jest.mocked(apiFetch);
const mockRequireProjectId = jest.mocked(requireProjectId);
const mockGetFlow = jest.mocked(getFlow);

describe('previews', () => {
  afterEach(() => jest.clearAllMocks());

  describe('listPreviews', () => {
    it('calls GET /api/projects/{pid}/flows/{fid}/previews', async () => {
      const mockResp = { previews: [], total: 0 };
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify(mockResp), { status: 200 }),
      );
      const result = await listPreviews({
        projectId: 'proj_x',
        flowId: 'fl_y',
      });
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_x/flows/fl_y/previews',
      );
      expect(result).toEqual(mockResp);
    });

    it('falls back to requireProjectId()', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ previews: [] }), { status: 200 }),
      );
      await listPreviews({ flowId: 'fl_y' });
      expect(mockRequireProjectId).toHaveBeenCalled();
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_default/flows/fl_y/previews',
      );
    });

    it('throws on non-ok response', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), {
          status: 401,
        }),
      );
      await expect(
        listPreviews({ projectId: 'proj_x', flowId: 'fl_y' }),
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('getPreview', () => {
    it('GETs /previews/{previewId}', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ id: 'prv_x' }), { status: 200 }),
      );
      await getPreview({
        projectId: 'proj_x',
        flowId: 'fl_y',
        previewId: 'prv_x',
      });
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_x/flows/fl_y/previews/prv_x',
      );
    });

    it('throws on error', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Not found' } }), {
          status: 404,
        }),
      );
      await expect(
        getPreview({
          projectId: 'proj_x',
          flowId: 'fl_y',
          previewId: 'missing',
        }),
      ).rejects.toThrow('Not found');
    });
  });

  describe('createPreview', () => {
    it('POSTs with flowSettingsId directly when provided', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            id: 'prv_x',
            activationUrl: 'https://site.example/?elbPreview=eyJ0.gr4nt.s1g',
            bundleUrl: 'https://cdn/walker.abc.js',
            createdBy: 'u',
            createdAt: '2026-04-21T00:00:00Z',
          }),
          { status: 201 },
        ),
      );
      await createPreview({
        projectId: 'proj_x',
        flowId: 'fl_y',
        flowSettingsId: 'fs_a',
      });
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_x/flows/fl_y/previews',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ flowSettingsId: 'fs_a' }),
        }),
      );
      expect(mockGetFlow).not.toHaveBeenCalled();
    });

    it('forwards source in the POST body when provided', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ id: 'prv_x' }), { status: 201 }),
      );
      await createPreview({
        projectId: 'proj_x',
        flowId: 'fl_y',
        flowSettingsId: 'fs_a',
        source: { kind: 'deployment-version', deploymentVersionId: 'dpv_1' },
      });
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_x/flows/fl_y/previews',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            flowSettingsId: 'fs_a',
            source: {
              kind: 'deployment-version',
              deploymentVersionId: 'dpv_1',
            },
          }),
        }),
      );
    });

    it('omits source from the POST body when not provided', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ id: 'prv_x' }), { status: 201 }),
      );
      await createPreview({
        projectId: 'proj_x',
        flowId: 'fl_y',
        flowSettingsId: 'fs_a',
      });
      const [, init] = mockApiFetch.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(init.body as string)).toEqual({
        flowSettingsId: 'fs_a',
      });
    });

    it('resolves flowName via getFlow then POSTs with resolved settingsId', async () => {
      mockGetFlow.mockResolvedValue({
        id: 'fl_y',
        settings: [
          { id: 'fs_a', name: 'demo' },
          { id: 'fs_b', name: 'staging' },
        ],
      } as never);
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ id: 'prv_x' }), { status: 201 }),
      );
      await createPreview({
        projectId: 'proj_x',
        flowId: 'fl_y',
        flowName: 'demo',
      });
      expect(mockGetFlow).toHaveBeenCalledWith({
        projectId: 'proj_x',
        flowId: 'fl_y',
      });
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_x/flows/fl_y/previews',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ flowSettingsId: 'fs_a' }),
        }),
      );
    });

    it('throws when neither flowName nor flowSettingsId provided', async () => {
      await expect(
        createPreview({ projectId: 'proj_x', flowId: 'fl_y' }),
      ).rejects.toThrow(/flow/i);
    });

    it('throws when flowName does not match any settings entry', async () => {
      mockGetFlow.mockResolvedValue({
        id: 'fl_y',
        settings: [{ id: 'fs_b', name: 'staging' }],
      } as never);
      await expect(
        createPreview({
          projectId: 'proj_x',
          flowId: 'fl_y',
          flowName: 'demo',
        }),
      ).rejects.toThrow(/not found|demo/i);
    });

    it('throws on API error', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Bad request' } }), {
          status: 400,
        }),
      );
      await expect(
        createPreview({
          projectId: 'proj_x',
          flowId: 'fl_y',
          flowSettingsId: 'fs_a',
        }),
      ).rejects.toThrow('Bad request');
    });

    describe('with --url (server-minted, origin-bound grant)', () => {
      const createBody = {
        id: 'prv_x',
        flowId: 'fl_y',
        flowSettingsId: 'fs_a',
        projectId: 'proj_x',
        bundleUrl: 'https://cdn/walker.k9x2m4p7abcd.js',
        activationUrl:
          'https://default-origin.example/?elbPreview=eyJ0.def4ult.s1g',
        createdBy: 'u',
        createdAt: '2026-04-21T00:00:00Z',
        grant: 'eyJ0.def4ult.s1g',
      };
      const grantBody = {
        grant: 'eyJhbGciOiJFUzI1NiJ9.my5ite.s1g',
        activationUrl:
          'https://my-site.com/?elbPreview=eyJhbGciOiJFUzI1NiJ9.my5ite.s1g',
        sessionExpiresAt: '2026-04-22T00:00:00Z',
      };

      it('mints an origin-bound grant for the url origin and returns its activationUrl', async () => {
        mockApiFetch
          .mockResolvedValueOnce(
            new Response(JSON.stringify(createBody), { status: 201 }),
          )
          .mockResolvedValueOnce(
            new Response(JSON.stringify(grantBody), { status: 200 }),
          );
        const result = await createPreview({
          projectId: 'proj_x',
          flowId: 'fl_y',
          flowSettingsId: 'fs_a',
          url: 'https://my-site.com/some/path?foo=1',
        });
        // create POST first, then the grant POST for the derived origin
        expect(mockApiFetch).toHaveBeenCalledTimes(2);
        expect(mockApiFetch).toHaveBeenNthCalledWith(
          1,
          '/api/projects/proj_x/flows/fl_y/previews',
          expect.objectContaining({ method: 'POST' }),
        );
        expect(mockApiFetch).toHaveBeenNthCalledWith(
          2,
          '/api/projects/proj_x/flows/fl_y/previews/prv_x/grant',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ origins: ['https://my-site.com'] }),
          }),
        );
        expect(result.activationUrl).toBe(grantBody.activationUrl);
      });

      it('does not mint a grant without url (single call, keeps the default activationUrl)', async () => {
        mockApiFetch.mockResolvedValueOnce(
          new Response(JSON.stringify(createBody), { status: 201 }),
        );
        const result = await createPreview({
          projectId: 'proj_x',
          flowId: 'fl_y',
          flowSettingsId: 'fs_a',
        });
        expect(mockApiFetch).toHaveBeenCalledTimes(1);
        expect(result.activationUrl).toBe(createBody.activationUrl);
      });

      it('throws on an invalid url before creating the preview (no network call)', async () => {
        await expect(
          createPreview({
            projectId: 'proj_x',
            flowId: 'fl_y',
            flowSettingsId: 'fs_a',
            url: 'not a url',
          }),
        ).rejects.toThrow(/invalid.*url/i);
        expect(mockApiFetch).not.toHaveBeenCalled();
      });

      it('throws when the grant route fails', async () => {
        mockApiFetch
          .mockResolvedValueOnce(
            new Response(JSON.stringify(createBody), { status: 201 }),
          )
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify({ error: { message: 'Grant denied' } }),
              { status: 403 },
            ),
          );
        await expect(
          createPreview({
            projectId: 'proj_x',
            flowId: 'fl_y',
            flowSettingsId: 'fs_a',
            url: 'https://my-site.com',
          }),
        ).rejects.toThrow('Grant denied');
      });

      it('names the orphaned preview when the grant mint fails after create', async () => {
        // The preview exists once the first POST succeeded; a grant failure
        // must surface its id so the caller can delete it or retry the mint.
        mockApiFetch
          .mockResolvedValueOnce(
            new Response(JSON.stringify(createBody), { status: 201 }),
          )
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify({ error: { message: 'Grant denied' } }),
              { status: 403 },
            ),
          );
        await expect(
          createPreview({
            projectId: 'proj_x',
            flowId: 'fl_y',
            flowSettingsId: 'fs_a',
            url: 'https://my-site.com',
          }),
        ).rejects.toThrow(/preview prv_x/);
      });
    });
  });

  describe('regrantPreview', () => {
    const grantBody = {
      grant: 'eyJhbGciOiJFUzI1NiJ9.my5ite.s1g',
      activationUrl:
        'https://my-site.com/?elbPreview=eyJhbGciOiJFUzI1NiJ9.my5ite.s1g',
      sessionExpiresAt: '2026-04-22T00:00:00Z',
    };

    it('POSTs origins to the grant route and returns the minted grant', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify(grantBody), { status: 200 }),
      );
      const result = await regrantPreview({
        projectId: 'proj_x',
        flowId: 'fl_y',
        previewId: 'prv_x',
        origins: ['https://my-site.com'],
      });
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_x/flows/fl_y/previews/prv_x/grant',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ origins: ['https://my-site.com'] }),
        }),
      );
      expect(result).toEqual(grantBody);
    });

    it('includes sessionId in the body when provided', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify(grantBody), { status: 200 }),
      );
      await regrantPreview({
        projectId: 'proj_x',
        flowId: 'fl_y',
        previewId: 'prv_x',
        origins: ['https://my-site.com'],
        sessionId: 'ses_1',
      });
      const [, init] = mockApiFetch.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(init.body as string)).toEqual({
        origins: ['https://my-site.com'],
        sessionId: 'ses_1',
      });
    });

    it('omits sessionId from the body when not provided', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify(grantBody), { status: 200 }),
      );
      await regrantPreview({
        projectId: 'proj_x',
        flowId: 'fl_y',
        previewId: 'prv_x',
        origins: ['https://my-site.com'],
      });
      const [, init] = mockApiFetch.mock.calls[0] as [string, RequestInit];
      expect(Object.keys(JSON.parse(init.body as string))).toEqual(['origins']);
    });

    it('falls back to requireProjectId()', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify(grantBody), { status: 200 }),
      );
      await regrantPreview({
        flowId: 'fl_y',
        previewId: 'prv_x',
        origins: ['https://my-site.com'],
      });
      expect(mockRequireProjectId).toHaveBeenCalled();
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_default/flows/fl_y/previews/prv_x/grant',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('throws when the grant route fails', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Grant denied' } }), {
          status: 403,
        }),
      );
      await expect(
        regrantPreview({
          projectId: 'proj_x',
          flowId: 'fl_y',
          previewId: 'prv_x',
          origins: ['https://my-site.com'],
        }),
      ).rejects.toThrow('Grant denied');
    });
  });

  describe('deletePreview', () => {
    it('DELETEs /previews/{previewId} and returns a confirmation record on 204 No Content', async () => {
      mockApiFetch.mockResolvedValue(new Response(null, { status: 204 }));
      const result = await deletePreview({
        projectId: 'proj_x',
        flowId: 'fl_y',
        previewId: 'prv_x',
      });
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_x/flows/fl_y/previews/prv_x',
        expect.objectContaining({ method: 'DELETE' }),
      );
      expect(result).toEqual({ deleted: true, previewId: 'prv_x' });
    });

    it('returns parsed body when server replies with JSON 200', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ deleted: true }), { status: 200 }),
      );
      const result = await deletePreview({
        projectId: 'proj_x',
        flowId: 'fl_y',
        previewId: 'prv_x',
      });
      expect(result).toEqual({ deleted: true });
    });

    it('returns a confirmation record when a JSON surface yields no body', async () => {
      mockApiFetch.mockResolvedValue(new Response('', { status: 200 }));
      const result = await deletePreview({
        projectId: 'proj_x',
        flowId: 'fl_y',
        previewId: 'prv_x',
      });
      expect(result).toEqual({ deleted: true, previewId: 'prv_x' });
    });

    it('throws on error', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Not found' } }), {
          status: 404,
        }),
      );
      await expect(
        deletePreview({
          projectId: 'proj_x',
          flowId: 'fl_y',
          previewId: 'missing',
        }),
      ).rejects.toThrow('Not found');
    });
  });
});
