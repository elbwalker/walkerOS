import {
  authenticatedFetch,
  requireProjectId,
  resolveBaseUrl,
} from '../../../core/auth.js';
import {
  listDeployments,
  getDeploymentBySlug,
  createDeployment,
  deleteDeployment,
} from '../../../commands/deployments/index.js';

jest.mock('../../../core/auth.js', () => ({
  ...jest.requireActual('../../../core/auth.js'),
  requireProjectId: jest.fn().mockReturnValue('proj_default'),
  resolveBaseUrl: jest.fn().mockReturnValue('https://app.walkeros.io'),
  authenticatedFetch: jest.fn(),
}));

const mockAuthenticatedFetch = jest.mocked(authenticatedFetch);
const mockRequireProjectId = jest.mocked(requireProjectId);

describe('deployments', () => {
  afterEach(() => jest.clearAllMocks());

  describe('listDeployments', () => {
    it('calls GET with correct URL', async () => {
      mockAuthenticatedFetch.mockResolvedValue(
        new Response(JSON.stringify({ deployments: [], total: 0 }), {
          status: 200,
        }),
      );
      const result = await listDeployments({ projectId: 'proj_123' });
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'https://app.walkeros.io/api/projects/proj_123/deployments',
      );
      expect(result).toEqual({ deployments: [], total: 0 });
    });

    it('includes query params for type and status', async () => {
      mockAuthenticatedFetch.mockResolvedValue(
        new Response(JSON.stringify({ deployments: [] }), { status: 200 }),
      );
      await listDeployments({
        projectId: 'proj_123',
        type: 'web',
        status: 'active',
      });
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'https://app.walkeros.io/api/projects/proj_123/deployments?type=web&status=active',
      );
    });

    it('throws on non-ok response', async () => {
      mockAuthenticatedFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), {
          status: 401,
        }),
      );
      await expect(listDeployments({ projectId: 'proj_123' })).rejects.toThrow(
        'Unauthorized',
      );
    });

    it('falls back to requireProjectId()', async () => {
      mockAuthenticatedFetch.mockResolvedValue(
        new Response(JSON.stringify({ deployments: [] }), { status: 200 }),
      );
      await listDeployments();
      expect(mockRequireProjectId).toHaveBeenCalled();
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'https://app.walkeros.io/api/projects/proj_default/deployments',
      );
    });
  });

  describe('getDeploymentBySlug', () => {
    it('calls GET with slug in URL', async () => {
      mockAuthenticatedFetch.mockResolvedValue(
        new Response(JSON.stringify({ slug: 'my-deploy' }), { status: 200 }),
      );
      const result = await getDeploymentBySlug({ slug: 'my-deploy' });
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'https://app.walkeros.io/api/projects/proj_default/deployments/my-deploy',
      );
      expect(result).toEqual({ slug: 'my-deploy' });
    });

    it('uses provided projectId', async () => {
      mockAuthenticatedFetch.mockResolvedValue(
        new Response(JSON.stringify({ slug: 'my-deploy' }), { status: 200 }),
      );
      await getDeploymentBySlug({ slug: 'my-deploy', projectId: 'proj_123' });
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'https://app.walkeros.io/api/projects/proj_123/deployments/my-deploy',
      );
    });

    it('throws on error', async () => {
      mockAuthenticatedFetch.mockResolvedValue(
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
      mockAuthenticatedFetch.mockResolvedValue(
        new Response(JSON.stringify({ slug: 'new-deploy', type: 'web' }), {
          status: 201,
        }),
      );
      const result = await createDeployment({
        type: 'web',
        label: 'My Deploy',
        projectId: 'proj_123',
      });
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'https://app.walkeros.io/api/projects/proj_123/deployments',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'web', label: 'My Deploy' }),
        },
      );
      expect(result).toEqual({ slug: 'new-deploy', type: 'web' });
    });

    it('throws on error', async () => {
      mockAuthenticatedFetch.mockResolvedValue(
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
      mockAuthenticatedFetch.mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      );
      const result = await deleteDeployment({
        slug: 'my-deploy',
        projectId: 'proj_123',
      });
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'https://app.walkeros.io/api/projects/proj_123/deployments/my-deploy',
        { method: 'DELETE' },
      );
      expect(result).toEqual({ success: true });
    });

    it('returns success on empty response', async () => {
      mockAuthenticatedFetch.mockResolvedValue(
        new Response('', { status: 200 }),
      );
      const result = await deleteDeployment({ slug: 'my-deploy' });
      expect(result).toEqual({ success: true });
    });

    it('throws on error', async () => {
      mockAuthenticatedFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Not found' } }), {
          status: 404,
        }),
      );
      await expect(deleteDeployment({ slug: 'missing' })).rejects.toThrow(
        'Not found',
      );
    });
  });
});
