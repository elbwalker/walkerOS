const mockApiRequest = jest.fn();
const mockRequireProjectId = jest.fn().mockReturnValue('proj_default');

jest.mock('../../core/auth.js', () => ({
  apiRequest: mockApiRequest,
  requireProjectId: mockRequireProjectId,
}));

describe('flows', () => {
  afterEach(() => jest.clearAllMocks());

  describe('listFlows', () => {
    it('should call GET /api/projects/{projectId}/flows', async () => {
      const { listFlows } = await import('../../commands/flows/index.js');
      mockApiRequest.mockResolvedValue({ flows: [], total: 0 });
      await listFlows({ projectId: 'proj_1' });
      expect(mockApiRequest).toHaveBeenCalledWith('/api/projects/proj_1/flows');
    });

    it('should fall back to requireProjectId()', async () => {
      const { listFlows } = await import('../../commands/flows/index.js');
      mockApiRequest.mockResolvedValue({ flows: [] });
      await listFlows();
      expect(mockRequireProjectId).toHaveBeenCalled();
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_default/flows',
      );
    });

    it('should pass query params', async () => {
      const { listFlows } = await import('../../commands/flows/index.js');
      mockApiRequest.mockResolvedValue({ flows: [] });
      await listFlows({
        projectId: 'proj_1',
        sort: 'name',
        order: 'asc',
        includeDeleted: true,
      });
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_1/flows?sort=name&order=asc&include_deleted=true',
      );
    });
  });

  describe('getFlow', () => {
    it('should call GET with flowId', async () => {
      const { getFlow } = await import('../../commands/flows/index.js');
      mockApiRequest.mockResolvedValue({ id: 'cfg_abc' });
      await getFlow({ flowId: 'cfg_abc', projectId: 'proj_1' });
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_1/flows/cfg_abc',
      );
    });

    it('should fall back to requireProjectId()', async () => {
      const { getFlow } = await import('../../commands/flows/index.js');
      mockApiRequest.mockResolvedValue({ id: 'cfg_abc' });
      await getFlow({ flowId: 'cfg_abc' });
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_default/flows/cfg_abc',
      );
    });
  });

  describe('createFlow', () => {
    it('should POST with name and content', async () => {
      const { createFlow } = await import('../../commands/flows/index.js');
      const content = { version: 1 };
      mockApiRequest.mockResolvedValue({ id: 'cfg_new' });
      await createFlow({ name: 'My Flow', content, projectId: 'proj_1' });
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_1/flows',
        {
          method: 'POST',
          body: JSON.stringify({ name: 'My Flow', content }),
        },
      );
    });
  });

  describe('updateFlow', () => {
    it('should PATCH with name and content', async () => {
      const { updateFlow } = await import('../../commands/flows/index.js');
      const content = { version: 1, sources: [] };
      mockApiRequest.mockResolvedValue({ id: 'cfg_abc' });
      await updateFlow({
        flowId: 'cfg_abc',
        name: 'Updated',
        content,
        projectId: 'proj_1',
      });
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_1/flows/cfg_abc',
        {
          method: 'PATCH',
          body: JSON.stringify({ name: 'Updated', content }),
        },
      );
    });

    it('should only include provided fields in body', async () => {
      const { updateFlow } = await import('../../commands/flows/index.js');
      mockApiRequest.mockResolvedValue({ id: 'cfg_abc' });
      await updateFlow({
        flowId: 'cfg_abc',
        name: 'Updated',
        projectId: 'proj_1',
      });
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_1/flows/cfg_abc',
        {
          method: 'PATCH',
          body: JSON.stringify({ name: 'Updated' }),
        },
      );
    });
  });

  describe('deleteFlow', () => {
    it('should send DELETE', async () => {
      const { deleteFlow } = await import('../../commands/flows/index.js');
      mockApiRequest.mockResolvedValue({ success: true });
      await deleteFlow({ flowId: 'cfg_abc', projectId: 'proj_1' });
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_1/flows/cfg_abc',
        { method: 'DELETE' },
      );
    });
  });

  describe('duplicateFlow', () => {
    it('should POST to /duplicate with optional name', async () => {
      const { duplicateFlow } = await import('../../commands/flows/index.js');
      mockApiRequest.mockResolvedValue({ id: 'cfg_copy' });
      await duplicateFlow({
        flowId: 'cfg_abc',
        name: 'My Copy',
        projectId: 'proj_1',
      });
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_1/flows/cfg_abc/duplicate',
        {
          method: 'POST',
          body: JSON.stringify({ name: 'My Copy' }),
        },
      );
    });

    it('should POST without name when not provided', async () => {
      const { duplicateFlow } = await import('../../commands/flows/index.js');
      mockApiRequest.mockResolvedValue({ id: 'cfg_copy' });
      await duplicateFlow({ flowId: 'cfg_abc', projectId: 'proj_1' });
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/api/projects/proj_1/flows/cfg_abc/duplicate',
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      );
    });
  });
});
