import { requireProjectId } from '../../../core/auth.js';
import {
  listFlows,
  listAllFlows,
  getFlow,
  createFlow,
  updateFlow,
  deleteFlow,
  duplicateFlow,
} from '../../../commands/flows/index.js';
import { listProjects } from '../../../commands/projects/index.js';
import { setupMockApiClient } from '../../helpers/mock-api-client.js';

jest.mock('../../../core/api-client.js');
jest.mock('../../../core/auth.js', () => ({
  ...jest.requireActual('../../../core/auth.js'),
  requireProjectId: jest.fn().mockReturnValue('proj_default'),
}));
jest.mock('../../../commands/projects/index.js', () => ({
  listProjects: jest.fn(),
}));

const mockListProjects = jest.mocked(listProjects);

const {
  GET: mockGet,
  POST: mockPost,
  PATCH: mockPatch,
  DELETE: mockDelete,
} = setupMockApiClient();

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
          params: {
            path: { projectId: 'proj_1', flowId: 'cfg_abc' },
            query: {},
          },
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
            query: {},
          },
        },
      );
    });

    it('passes fields query param', async () => {
      mockGet.mockResolvedValue({ data: { id: 'cfg_abc' } });
      await getFlow({
        flowId: 'cfg_abc',
        projectId: 'proj_1',
        fields: ['content.variables', 'content.flows.web'],
      });
      expect(mockGet).toHaveBeenCalledWith(
        '/api/projects/{projectId}/flows/{flowId}',
        {
          params: {
            path: { projectId: 'proj_1', flowId: 'cfg_abc' },
            query: { fields: 'content.variables,content.flows.web' },
          },
        },
      );
    });
  });

  describe('createFlow', () => {
    it('POSTs with name and content', async () => {
      const content = { version: 3 };
      mockPost.mockResolvedValue({ data: { id: 'cfg_new' } });
      await createFlow({ name: 'My Flow', content, projectId: 'proj_1' });
      expect(mockPost).toHaveBeenCalledWith('/api/projects/{projectId}/flows', {
        params: { path: { projectId: 'proj_1' } },
        body: { name: 'My Flow', config: content },
      });
    });
  });

  describe('updateFlow', () => {
    it('PATCHes with name and content', async () => {
      const content = { version: 3, sources: [] };
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
          body: { name: 'Updated', config: content },
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

    it('sends merge-patch content type when mergePatch is true', async () => {
      const content = { variables: { trackingId: 'G-NEW' } };
      mockPatch.mockResolvedValue({ data: { id: 'cfg_abc' } });
      await updateFlow({
        flowId: 'cfg_abc',
        content,
        projectId: 'proj_1',
        mergePatch: true,
      });
      expect(mockPatch).toHaveBeenCalledWith(
        '/api/projects/{projectId}/flows/{flowId}',
        {
          params: {
            path: { projectId: 'proj_1', flowId: 'cfg_abc' },
          },
          body: { config: content },
          headers: { 'Content-Type': 'application/merge-patch+json' },
        },
      );
    });

    it('sends application/json by default (no mergePatch)', async () => {
      const content = { version: 3, flows: {} };
      mockPatch.mockResolvedValue({ data: { id: 'cfg_abc' } });
      await updateFlow({
        flowId: 'cfg_abc',
        content,
        projectId: 'proj_1',
      });
      expect(mockPatch).toHaveBeenCalledWith(
        '/api/projects/{projectId}/flows/{flowId}',
        {
          params: {
            path: { projectId: 'proj_1', flowId: 'cfg_abc' },
          },
          body: { config: content },
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

  describe('listAllFlows', () => {
    const mockFlowSummary = {
      id: 'flow_1',
      name: 'Test Flow',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
    };

    it('returns flows grouped by project', async () => {
      mockListProjects.mockResolvedValue({
        projects: [
          {
            id: 'proj_a',
            name: 'Project A',
            role: 'owner',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'proj_b',
            name: 'Project B',
            role: 'member',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        total: 2,
      });
      mockGet
        .mockResolvedValueOnce({
          data: { flows: [mockFlowSummary], total: 1 },
        })
        .mockResolvedValueOnce({
          data: {
            flows: [{ ...mockFlowSummary, id: 'flow_2', name: 'Other Flow' }],
            total: 1,
          },
        });

      const result = await listAllFlows();

      expect(result).toEqual([
        {
          project: { id: 'proj_a', name: 'Project A' },
          flows: [mockFlowSummary],
        },
        {
          project: { id: 'proj_b', name: 'Project B' },
          flows: [{ ...mockFlowSummary, id: 'flow_2', name: 'Other Flow' }],
        },
      ]);
    });

    it('returns empty array when no projects', async () => {
      mockListProjects.mockResolvedValue({ projects: [], total: 0 });

      const result = await listAllFlows();

      expect(result).toEqual([]);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('passes sort/order/includeDeleted to each listFlows call', async () => {
      mockListProjects.mockResolvedValue({
        projects: [
          {
            id: 'proj_a',
            name: 'Project A',
            role: 'owner',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'proj_b',
            name: 'Project B',
            role: 'member',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        total: 2,
      });
      mockGet.mockResolvedValue({ data: { flows: [], total: 0 } });

      await listAllFlows({ sort: 'name', order: 'asc', includeDeleted: true });

      expect(mockGet).toHaveBeenCalledTimes(2);
      expect(mockGet).toHaveBeenCalledWith('/api/projects/{projectId}/flows', {
        params: {
          path: { projectId: 'proj_a' },
          query: {
            sort: 'name',
            order: 'asc',
            include_deleted: 'true',
          },
        },
      });
      expect(mockGet).toHaveBeenCalledWith('/api/projects/{projectId}/flows', {
        params: {
          path: { projectId: 'proj_b' },
          query: {
            sort: 'name',
            order: 'asc',
            include_deleted: 'true',
          },
        },
      });
    });
  });
});
