import { apiFetch } from '../../../core/http.js';
import { listProjectsCommand } from '../../../commands/projects/index.js';
import { listFlowsCommand } from '../../../commands/flows/index.js';
import { listDeploymentsCommand } from '../../../commands/deployments/index.js';
import { setupMockApiClient } from '../../helpers/mock-api-client.js';

jest.mock('../../../core/api-client.js');
jest.mock('../../../core/auth.js', () => ({
  ...jest.requireActual('../../../core/auth.js'),
  requireProjectId: jest.fn().mockReturnValue('proj_default'),
}));
jest.mock('../../../core/http.js', () => ({
  apiFetch: jest.fn(),
}));
jest.mock('../../../core/output.js', () => ({
  writeResult: jest.fn().mockResolvedValue(undefined),
}));

const { GET: mockGet } = setupMockApiClient();
const mockApiFetch = jest.mocked(apiFetch);

describe('CLI list-command pagination forwarding', () => {
  afterEach(() => jest.clearAllMocks());

  describe('listProjectsCommand', () => {
    it('forwards --cursor and --limit through to GET /api/projects', async () => {
      mockGet.mockResolvedValue({
        data: { projects: [], total: 0, nextCursor: null },
      });

      await listProjectsCommand({ cursor: 'c1', limit: 25 });

      expect(mockGet).toHaveBeenCalledWith('/api/projects', {
        params: { query: { cursor: 'c1', limit: 25 } },
      });
    });
  });

  describe('listFlowsCommand', () => {
    it('forwards --cursor and --limit through to GET /api/projects/{pid}/flows', async () => {
      mockGet.mockResolvedValue({ data: { flows: [], total: 0 } });

      await listFlowsCommand({ project: 'proj_1', cursor: 'fc1', limit: 50 });

      expect(mockGet).toHaveBeenCalledWith('/api/projects/{projectId}/flows', {
        params: {
          path: { projectId: 'proj_1' },
          query: {
            sort: undefined,
            order: undefined,
            include_deleted: undefined,
            cursor: 'fc1',
            limit: 50,
          },
        },
      });
    });
  });

  describe('listDeploymentsCommand', () => {
    it('forwards --cursor and --limit through to /api/projects/{pid}/deployments', async () => {
      mockApiFetch.mockResolvedValue(
        new Response(JSON.stringify({ deployments: [], total: 0 }), {
          status: 200,
        }),
      );

      await listDeploymentsCommand({
        project: 'proj_1',
        cursor: 'dc1',
        limit: 30,
      });

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_1/deployments?cursor=dc1&limit=30',
      );
    });
  });
});
