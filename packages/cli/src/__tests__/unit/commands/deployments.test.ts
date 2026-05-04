import { requireProjectId } from '../../../core/auth.js';
import { apiFetch } from '../../../core/http.js';
import {
  listDeployments,
  getDeploymentBySlug,
  createDeployment,
  deleteDeployment,
  deleteDeploymentByFlowId,
  DeploymentAmbiguityError,
} from '../../../commands/deployments/index.js';

jest.mock('../../../core/auth.js', () => ({
  ...jest.requireActual('../../../core/auth.js'),
  requireProjectId: jest.fn().mockReturnValue('proj_default'),
}));
jest.mock('../../../core/http.js', () => ({
  apiFetch: jest.fn(),
}));

const mockApiFetch = jest.mocked(apiFetch);
const mockRequireProjectId = jest.mocked(requireProjectId);

describe('deployments', () => {
  afterEach(() => jest.clearAllMocks());

  describe('listDeployments', () => {
    it('calls GET with correct URL', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ deployments: [], total: 0 }), {
          status: 200,
        }),
      );
      const result = await listDeployments({ projectId: 'proj_123' });
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_123/deployments',
      );
      expect(result).toEqual({ deployments: [], total: 0 });
    });

    it('includes query params for type and status', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ deployments: [] }), { status: 200 }),
      );
      await listDeployments({
        projectId: 'proj_123',
        type: 'web',
        status: 'active',
      });
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_123/deployments?type=web&status=active',
      );
    });

    it('appends flowId when provided', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ deployments: [] }), { status: 200 }),
      );
      await listDeployments({
        projectId: 'proj_123',
        flowId: 'flow_abc',
      });
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_123/deployments?flowId=flow_abc',
      );
    });

    it('omits flowId when not provided', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ deployments: [] }), { status: 200 }),
      );
      await listDeployments({ projectId: 'proj_123' });
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_123/deployments',
      );
    });

    it('throws on non-ok response', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), {
          status: 401,
        }),
      );
      await expect(listDeployments({ projectId: 'proj_123' })).rejects.toThrow(
        'Unauthorized',
      );
    });

    it('falls back to requireProjectId()', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ deployments: [] }), { status: 200 }),
      );
      await listDeployments();
      expect(mockRequireProjectId).toHaveBeenCalled();
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_default/deployments',
      );
    });
  });

  describe('getDeploymentBySlug', () => {
    it('calls GET with slug in URL', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ slug: 'my-deploy' }), { status: 200 }),
      );
      const result = await getDeploymentBySlug({ slug: 'my-deploy' });
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_default/deployments/my-deploy',
      );
      expect(result).toEqual({ slug: 'my-deploy' });
    });

    it('uses provided projectId', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ slug: 'my-deploy' }), { status: 200 }),
      );
      await getDeploymentBySlug({ slug: 'my-deploy', projectId: 'proj_123' });
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_123/deployments/my-deploy',
      );
    });

    it('throws on error', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Not found' } }), {
          status: 404,
        }),
      );
      await expect(getDeploymentBySlug({ slug: 'missing' })).rejects.toThrow(
        'Not found',
      );
    });
  });

  describe('createDeployment', () => {
    it('POSTs with type and label', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ slug: 'new-deploy', type: 'web' }), {
          status: 201,
        }),
      );
      const result = await createDeployment({
        type: 'web',
        label: 'My Deploy',
        projectId: 'proj_123',
      });
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_123/deployments',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'web', label: 'My Deploy' }),
        },
      );
      expect(result).toEqual({ slug: 'new-deploy', type: 'web' });
    });

    it('throws on error', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Bad request' } }), {
          status: 400,
        }),
      );
      await expect(createDeployment({ type: 'server' })).rejects.toThrow(
        'Bad request',
      );
    });
  });

  describe('deleteDeployment', () => {
    it('sends DELETE', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      );
      const result = await deleteDeployment({
        slug: 'my-deploy',
        projectId: 'proj_123',
      });
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_123/deployments/my-deploy',
        { method: 'DELETE' },
      );
      expect(result).toEqual({ success: true });
    });

    it('returns success on empty response', async () => {
      mockApiFetch.mockResolvedValue(new Response('', { status: 200 }));
      const result = await deleteDeployment({ slug: 'my-deploy' });
      expect(result).toEqual({ success: true });
    });

    it('throws on error', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Not found' } }), {
          status: 404,
        }),
      );
      await expect(deleteDeployment({ slug: 'missing' })).rejects.toThrow(
        'Not found',
      );
    });
  });

  describe('deleteDeploymentByFlowId', () => {
    it('verifies slug belongs to flow before deleting', async () => {
      mockApiFetch
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              deployments: [
                {
                  slug: 'my-deploy',
                  type: 'web',
                  status: 'active',
                  updatedAt: '2026-04-22T00:00:00.000Z',
                },
                {
                  slug: 'other-deploy',
                  type: 'web',
                  status: 'active',
                  updatedAt: '2026-04-21T00:00:00.000Z',
                },
              ],
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true }), { status: 200 }),
        );
      await deleteDeploymentByFlowId({
        projectId: 'proj_123',
        flowId: 'flow_abc',
        slug: 'my-deploy',
      });
      expect(mockApiFetch).toHaveBeenCalledTimes(2);
      expect(mockApiFetch).toHaveBeenNthCalledWith(
        1,
        '/api/projects/proj_123/deployments?flowId=flow_abc',
      );
      expect(mockApiFetch).toHaveBeenNthCalledWith(
        2,
        '/api/projects/proj_123/deployments/my-deploy',
        { method: 'DELETE' },
      );
    });

    it('throws when slug does not belong to the flow', async () => {
      mockApiFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            deployments: [
              {
                slug: 'other-deploy',
                type: 'web',
                status: 'active',
                updatedAt: '2026-04-22T00:00:00.000Z',
              },
            ],
          }),
          { status: 200 },
        ),
      );
      await expect(
        deleteDeploymentByFlowId({
          projectId: 'proj_123',
          flowId: 'flow_abc',
          slug: 'wrong-slug',
        }),
      ).rejects.toThrow('No deployment with slug wrong-slug in flow flow_abc');
    });

    it('lists then deletes the single match when no slug provided', async () => {
      mockApiFetch
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              deployments: [
                {
                  slug: 'only-one',
                  type: 'web',
                  status: 'active',
                  updatedAt: '2026-04-22T00:00:00.000Z',
                },
              ],
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true }), { status: 200 }),
        );

      await deleteDeploymentByFlowId({
        projectId: 'proj_123',
        flowId: 'flow_abc',
      });

      expect(mockApiFetch).toHaveBeenCalledTimes(2);
      expect(mockApiFetch).toHaveBeenNthCalledWith(
        1,
        '/api/projects/proj_123/deployments?flowId=flow_abc',
      );
      expect(mockApiFetch).toHaveBeenNthCalledWith(
        2,
        '/api/projects/proj_123/deployments/only-one',
        { method: 'DELETE' },
      );
    });

    it('throws DeploymentAmbiguityError when multiple active matches and no slug', async () => {
      mockApiFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            deployments: [
              {
                slug: 'one',
                type: 'web',
                status: 'active',
                updatedAt: '2026-04-20T00:00:00.000Z',
              },
              {
                slug: 'two',
                type: 'web',
                status: 'active',
                updatedAt: '2026-04-21T00:00:00.000Z',
              },
            ],
          }),
          { status: 200 },
        ),
      );

      await expect(
        deleteDeploymentByFlowId({
          projectId: 'proj_123',
          flowId: 'flow_abc',
        }),
      ).rejects.toBeInstanceOf(DeploymentAmbiguityError);
    });

    it('throws a plain error when no matches found', async () => {
      mockApiFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ deployments: [] }), { status: 200 }),
      );
      await expect(
        deleteDeploymentByFlowId({
          projectId: 'proj_123',
          flowId: 'flow_abc',
        }),
      ).rejects.toThrow('No deployments found for flow flow_abc');
    });
  });
});
