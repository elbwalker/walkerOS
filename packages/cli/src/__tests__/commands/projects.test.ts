import { createApiClient } from '../../core/api-client.js';
import { requireProjectId } from '../../core/auth.js';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from '../../commands/projects/index.js';

jest.mock('../../core/api-client.js');
jest.mock('../../core/auth.js', () => ({
  ...jest.requireActual('../../core/auth.js'),
  requireProjectId: jest.fn().mockReturnValue('proj_default'),
}));

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();

(createApiClient as jest.Mock).mockReturnValue({
  GET: mockGet,
  POST: mockPost,
  PATCH: mockPatch,
  DELETE: mockDelete,
});

const mockRequireProjectId = jest.mocked(requireProjectId);

describe('projects', () => {
  afterEach(() => jest.clearAllMocks());

  describe('listProjects', () => {
    it('calls GET /api/projects', async () => {
      mockGet.mockResolvedValue({ data: { projects: [], total: 0 } });
      const result = await listProjects();
      expect(mockGet).toHaveBeenCalledWith('/api/projects');
      expect(result).toEqual({ projects: [], total: 0 });
    });

    it('throws on error response', async () => {
      mockGet.mockResolvedValue({
        error: { error: { message: 'Unauthorized' } },
      });
      await expect(listProjects()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getProject', () => {
    it('uses provided projectId', async () => {
      mockGet.mockResolvedValue({ data: { id: 'proj_123' } });
      await getProject({ projectId: 'proj_123' });
      expect(mockGet).toHaveBeenCalledWith('/api/projects/{projectId}', {
        params: { path: { projectId: 'proj_123' } },
      });
    });

    it('falls back to requireProjectId()', async () => {
      mockGet.mockResolvedValue({ data: { id: 'proj_default' } });
      await getProject();
      expect(mockRequireProjectId).toHaveBeenCalled();
      expect(mockGet).toHaveBeenCalledWith('/api/projects/{projectId}', {
        params: { path: { projectId: 'proj_default' } },
      });
    });
  });

  describe('createProject', () => {
    it('POSTs with name', async () => {
      mockPost.mockResolvedValue({
        data: { id: 'proj_new', name: 'Test' },
      });
      await createProject({ name: 'Test' });
      expect(mockPost).toHaveBeenCalledWith('/api/projects', {
        body: { name: 'Test' },
      });
    });
  });

  describe('updateProject', () => {
    it('PATCHes with name', async () => {
      mockPatch.mockResolvedValue({
        data: { id: 'proj_123', name: 'Updated' },
      });
      await updateProject({ projectId: 'proj_123', name: 'Updated' });
      expect(mockPatch).toHaveBeenCalledWith('/api/projects/{projectId}', {
        params: { path: { projectId: 'proj_123' } },
        body: { name: 'Updated' },
      });
    });
  });

  describe('deleteProject', () => {
    it('sends DELETE and returns success', async () => {
      mockDelete.mockResolvedValue({ data: undefined });
      const result = await deleteProject({ projectId: 'proj_123' });
      expect(mockDelete).toHaveBeenCalledWith('/api/projects/{projectId}', {
        params: { path: { projectId: 'proj_123' } },
      });
      expect(result).toEqual({ success: true });
    });
  });
});
