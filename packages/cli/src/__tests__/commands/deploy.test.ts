import { createApiClient } from '../../core/api-client.js';
import {
  authenticatedFetch,
  requireProjectId,
  resolveBaseUrl,
} from '../../core/auth.js';
import { getFlow } from '../../commands/flows/index.js';
import { deploy, getDeployment } from '../../commands/deploy/index.js';
import { bundleRemote } from '../../commands/bundle/index.js';

jest.mock('../../core/api-client.js');
jest.mock('../../core/auth.js', () => ({
  ...jest.requireActual('../../core/auth.js'),
  requireProjectId: jest.fn().mockReturnValue('proj_default'),
  resolveBaseUrl: jest.fn().mockReturnValue('https://app.walkeros.io'),
  authenticatedFetch: jest.fn(),
}));
jest.mock('../../commands/flows/index.js', () => ({
  getFlow: jest.fn(),
}));

const mockPost = jest.fn();
const mockGet = jest.fn();

(createApiClient as jest.Mock).mockReturnValue({
  GET: mockGet,
  POST: mockPost,
  PATCH: jest.fn(),
  DELETE: jest.fn(),
});

const mockGetFlow = jest.mocked(getFlow);
const mockAuthFetch = jest.mocked(authenticatedFetch);

const multiFlowContent = {
  content: {
    flows: {
      web: { web: {} },
      server: { server: {} },
    },
  },
};

describe('deploy', () => {
  afterEach(() => jest.clearAllMocks());

  describe('deploy() without flowName', () => {
    it('calls legacy POST route', async () => {
      mockPost.mockResolvedValue({
        data: { status: 'bundling', deploymentId: 'dep_1' },
      });
      await deploy({ flowId: 'cfg_1', wait: false });
      expect(mockPost).toHaveBeenCalledWith(
        '/api/projects/{projectId}/flows/{flowId}/deploy',
        { params: { path: { projectId: 'proj_default', flowId: 'cfg_1' } } },
      );
    });

    it('handles AMBIGUOUS_CONFIG with helpful error', async () => {
      mockPost.mockResolvedValue({
        error: {
          error: { message: 'Ambiguous config', code: 'AMBIGUOUS_CONFIG' },
        },
      });
      mockGetFlow.mockResolvedValue(multiFlowContent as any);

      await expect(deploy({ flowId: 'cfg_1' })).rejects.toThrow(
        /Use --flow <name> to specify one/,
      );
    });
  });

  describe('deploy() with flowName', () => {
    it('resolves configId and calls per-config route', async () => {
      mockGetFlow.mockResolvedValue(multiFlowContent as any);
      mockAuthFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ status: 'bundling', deploymentId: 'dep_1' }),
          {
            status: 200,
          },
        ),
      );

      await deploy({ flowId: 'cfg_1', flowName: 'web', wait: false });

      expect(mockGetFlow).toHaveBeenCalledWith({
        flowId: 'cfg_1',
        projectId: 'proj_default',
      });
      expect(mockAuthFetch).toHaveBeenCalledWith(
        'https://app.walkeros.io/api/projects/proj_default/flows/cfg_1/configs/web/deploy',
        { method: 'POST' },
      );
    });

    it('throws with available names when flowName not found', async () => {
      mockGetFlow.mockResolvedValue(multiFlowContent as any);

      await expect(
        deploy({ flowId: 'cfg_1', flowName: 'nonexistent' }),
      ).rejects.toThrow(/Flow "nonexistent" not found. Available: web, server/);
    });

    it('polls advance endpoint when wait=true', async () => {
      jest.useFakeTimers();
      mockGetFlow.mockResolvedValue(multiFlowContent as any);

      // First call: trigger deploy
      mockAuthFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ status: 'bundling', deploymentId: 'dep_1' }),
          { status: 200 },
        ),
      );
      // Second call: advance -> published
      mockAuthFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'published',
            publicUrl: 'https://cdn.example.com/walker.js',
          }),
          { status: 200 },
        ),
      );

      const promise = deploy({
        flowId: 'cfg_1',
        flowName: 'web',
        wait: true,
      });

      // Advance past the 3s poll delay
      await jest.advanceTimersByTimeAsync(3000);

      const result = await promise;

      expect(result).toMatchObject({ status: 'published' });
      expect(mockAuthFetch).toHaveBeenCalledTimes(2);
      expect(mockAuthFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/configs/web/deployments/dep_1/advance'),
        { method: 'POST' },
      );
      jest.useRealTimers();
    });
  });

  describe('getDeployment()', () => {
    it('without flowName calls typed GET route', async () => {
      mockGet.mockResolvedValue({
        data: { id: 'dep_1', type: 'web', status: 'published' },
      });
      await getDeployment({ flowId: 'cfg_1' });
      expect(mockGet).toHaveBeenCalledWith(
        '/api/projects/{projectId}/flows/{flowId}/deploy',
        { params: { path: { projectId: 'proj_default', flowId: 'cfg_1' } } },
      );
    });

    it('with flowName calls per-config GET route', async () => {
      mockGetFlow.mockResolvedValue(multiFlowContent as any);
      mockAuthFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ id: 'dep_1', type: 'web', status: 'published' }),
          { status: 200 },
        ),
      );

      await getDeployment({ flowId: 'cfg_1', flowName: 'web' });

      expect(mockAuthFetch).toHaveBeenCalledWith(
        'https://app.walkeros.io/api/projects/proj_default/flows/cfg_1/configs/web/deploy',
      );
    });
  });

  describe('bundleRemote()', () => {
    it('without flowName sends only flow in body', async () => {
      const content = { version: 1, flows: { default: {} } };
      mockPost.mockResolvedValue({
        data: 'console.log("bundle")',
        response: { headers: new Headers() },
      });
      await bundleRemote({ content });
      expect(mockPost).toHaveBeenCalledWith('/api/bundle', {
        body: { flow: content },
        parseAs: 'text',
      });
    });

    it('with flowName includes flowName in body', async () => {
      const content = { version: 1, flows: { web: {}, server: {} } };
      mockPost.mockResolvedValue({
        data: 'console.log("bundle")',
        response: { headers: new Headers() },
      });
      await bundleRemote({ content, flowName: 'web' });
      expect(mockPost).toHaveBeenCalledWith('/api/bundle', {
        body: { flow: content, flowName: 'web' },
        parseAs: 'text',
      });
    });
  });
});
