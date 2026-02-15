import { createApiClient } from '../../core/api-client.js';
import { requireProjectId } from '../../core/auth.js';
import {
  listFlows,
  getFlow,
  createFlow,
  updateFlow,
  deleteFlow,
  duplicateFlow,
} from '../../commands/flows/index.js';

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

describe('flows', () => {
  afterEach(() => jest.clearAllMocks());

  describe('listFlows', () => {
    it('calls GET /api/projects/{projectId}/flows', async () => {
      mockGet.mockResolvedValue({ data: { flows: [], total: 0 } });
      await listFlows({ projectId: 'proj_1' });
      expect(mockGet).toHaveBeenCalledWith('/api/projects/{projectId}/flows', {
        params: {
          path: { projectId: 'proj_1' },
          query: {
            sort: undefined,
            order: undefined,
            include_deleted: undefined,
          },
        },
      });
    });

    it('falls back to requireProjectId()', async () => {
      mockGet.mockResolvedValue({ data: { flows: [] } });
      await listFlows();
      expect(mockRequireProjectId).toHaveBeenCalled();
    });

    it('passes query params', async () => {
      mockGet.mockResolvedValue({ data: { flows: [] } });
      await listFlows({
        projectId: 'proj_1',
        sort: 'name',
        order: 'asc',
        includeDeleted: true,
      });
      expect(mockGet).toHaveBeenCalledWith('/api/projects/{projectId}/flows', {
        params: {
          path: { projectId: 'proj_1' },
          query: {
            sort: 'name',
            order: 'asc',
            include_deleted: 'true',
          },
        },
      });
    });
  });

  describe('getFlow', () => {
    it('calls GET with flowId', async () => {
      mockGet.mockResolvedValue({ data: { id: 'cfg_abc' } });
      await getFlow({ flowId: 'cfg_abc', projectId: 'proj_1' });
      expect(mockGet).toHaveBeenCalledWith(
        '/api/projects/{projectId}/flows/{flowId}',
        {
          params: { path: { projectId: 'proj_1', flowId: 'cfg_abc' } },
        },
      );
    });

    it('falls back to requireProjectId()', async () => {
      mockGet.mockResolvedValue({ data: { id: 'cfg_abc' } });
      await getFlow({ flowId: 'cfg_abc' });
      expect(mockGet).toHaveBeenCalledWith(
        '/api/projects/{projectId}/flows/{flowId}',
        {
          params: {
            path: { projectId: 'proj_default', flowId: 'cfg_abc' },
          },
        },
      );
    });
  });

  describe('createFlow', () => {
    it('POSTs with name and content', async () => {
      const content = { version: 1 };
      mockPost.mockResolvedValue({ data: { id: 'cfg_new' } });
      await createFlow({ name: 'My Flow', content, projectId: 'proj_1' });
      expect(mockPost).toHaveBeenCalledWith('/api/projects/{projectId}/flows', {
        params: { path: { projectId: 'proj_1' } },
        body: { name: 'My Flow', content },
      });
    });
  });

  describe('updateFlow', () => {
    it('PATCHes with name and content', async () => {
      const content = { version: 1, sources: [] };
      mockPatch.mockResolvedValue({ data: { id: 'cfg_abc' } });
      await updateFlow({
        flowId: 'cfg_abc',
        name: 'Updated',
        content,
        projectId: 'proj_1',
      });
      expect(mockPatch).toHaveBeenCalledWith(
        '/api/projects/{projectId}/flows/{flowId}',
        {
          params: {
            path: { projectId: 'proj_1', flowId: 'cfg_abc' },
          },
          body: { name: 'Updated', content },
        },
      );
    });

    it('only includes provided fields in body', async () => {
      mockPatch.mockResolvedValue({ data: { id: 'cfg_abc' } });
      await updateFlow({
        flowId: 'cfg_abc',
        name: 'Updated',
        projectId: 'proj_1',
      });
      expect(mockPatch).toHaveBeenCalledWith(
        '/api/projects/{projectId}/flows/{flowId}',
        {
          params: {
            path: { projectId: 'proj_1', flowId: 'cfg_abc' },
          },
          body: { name: 'Updated' },
        },
      );
    });
  });

  describe('deleteFlow', () => {
    it('sends DELETE and returns success', async () => {
      mockDelete.mockResolvedValue({ data: undefined });
      const result = await deleteFlow({
        flowId: 'cfg_abc',
        projectId: 'proj_1',
      });
      expect(mockDelete).toHaveBeenCalledWith(
        '/api/projects/{projectId}/flows/{flowId}',
        {
          params: { path: { projectId: 'proj_1', flowId: 'cfg_abc' } },
        },
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('duplicateFlow', () => {
    it('POSTs to /duplicate with optional name', async () => {
      mockPost.mockResolvedValue({ data: { id: 'cfg_copy' } });
      await duplicateFlow({
        flowId: 'cfg_abc',
        name: 'My Copy',
        projectId: 'proj_1',
      });
      expect(mockPost).toHaveBeenCalledWith(
        '/api/projects/{projectId}/flows/{flowId}/duplicate',
        {
          params: { path: { projectId: 'proj_1', flowId: 'cfg_abc' } },
          body: { name: 'My Copy' },
        },
      );
    });

    it('POSTs without name when not provided', async () => {
      mockPost.mockResolvedValue({ data: { id: 'cfg_copy' } });
      await duplicateFlow({ flowId: 'cfg_abc', projectId: 'proj_1' });
      expect(mockPost).toHaveBeenCalledWith(
        '/api/projects/{projectId}/flows/{flowId}/duplicate',
        {
          params: { path: { projectId: 'proj_1', flowId: 'cfg_abc' } },
          body: { name: undefined },
        },
      );
    });
  });
});
