import { requireProjectId } from '../../../core/auth.js';
import { apiFetch } from '../../../core/http.js';
import { getFlow } from '../../flows/index.js';
import {
  listPreviews,
  getPreview,
  createPreview,
  deletePreview,
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
            token: 't',
            activationUrl: '?elbPreview=t',
            bundleUrl: 'https://cdn/walker.t.js',
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
  });

  describe('deletePreview', () => {
    it('DELETEs /previews/{previewId} and returns null on 204 No Content', async () => {
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
      expect(result).toBeNull();
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
