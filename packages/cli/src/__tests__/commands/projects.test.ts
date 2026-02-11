import { apiRequest, requireProjectId } from '../../core/auth.js';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from '../../commands/projects/index.js';

jest.mock('../../core/auth.js', () => ({
  apiRequest: jest.fn(),
  requireProjectId: jest.fn().mockReturnValue('proj_default'),
}));

const mockApiRequest = jest.mocked(apiRequest);
const mockRequireProjectId = jest.mocked(requireProjectId);

describe('projects', () => {
  afterEach(() => jest.clearAllMocks());

  describe('listProjects', () => {
    it('should call GET /api/projects', async () => {
      mockApiRequest.mockResolvedValue({ projects: [], total: 0 });
      const result = await listProjects();
      expect(mockApiRequest).toHaveBeenCalledWith('/api/projects');
      expect(result).toEqual({ projects: [], total: 0 });
    });
  });

  describe('getProject', () => {
    it('should use provided projectId', async () => {
      mockApiRequest.mockResolvedValue({ id: 'proj_123' });
      await getProject({ projectId: 'proj_123' });
      expect(mockApiRequest).toHaveBeenCalledWith('/api/projects/proj_123');
    });

    it('should fall back to requireProjectId()', async () => {
      mockApiRequest.mockResolvedValue({ id: 'proj_default' });
      await getProject();
      expect(mockRequireProjectId).toHaveBeenCalled();
      expect(mockApiRequest).toHaveBeenCalledWith('/api/projects/proj_default');
    });
  });

  describe('createProject', () => {
    it('should POST with name', async () => {
      mockApiRequest.mockResolvedValue({ id: 'proj_new', name: 'Test' });
      await createProject({ name: 'Test' });
      expect(mockApiRequest).toHaveBeenCalledWith('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      });
    });
  });

  describe('updateProject', () => {
    it('should PATCH with name', async () => {
      mockApiRequest.mockResolvedValue({ id: 'proj_123', name: 'Updated' });
      await updateProject({ projectId: 'proj_123', name: 'Updated' });
      expect(mockApiRequest).toHaveBeenCalledWith('/api/projects/proj_123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      });
    });
  });

  describe('deleteProject', () => {
    it('should send DELETE', async () => {
      mockApiRequest.mockResolvedValue({ success: true });
      await deleteProject({ projectId: 'proj_123' });
      expect(mockApiRequest).toHaveBeenCalledWith('/api/projects/proj_123', {
        method: 'DELETE',
      });
    });
  });
});
