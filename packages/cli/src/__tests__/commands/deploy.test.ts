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
  configs: [
    { id: 'cfg_web', name: 'web', platform: 'web' },
    { id: 'cfg_server', name: 'server', platform: 'server' },
  ],
};

/** Helper to create an SSE stream response body */
function createSSEStreamBody(events: Array<{ event: string; data: object }>) {
  const text = events
    .map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`)
    .join('');
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

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

    it('streams deployment status via SSE when wait=true', async () => {
      mockPost.mockResolvedValue({
        data: { status: 'bundling', deploymentId: 'dep_1' },
      });

      // SSE stream response
      mockAuthFetch.mockResolvedValueOnce(
        new Response(
          createSSEStreamBody([
            {
              event: 'status',
              data: { status: 'bundling', substatus: 'building' },
            },
            {
              event: 'status',
              data: {
                status: 'published',
                substatus: null,
                publicUrl: 'https://cdn.example.com/walker.js',
              },
            },
            { event: 'done', data: {} },
          ]),
          {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          },
        ),
      );

      const statuses: string[] = [];
      const result = await deploy({
        flowId: 'cfg_1',
        wait: true,
        onStatus: (status) => statuses.push(status),
      });

      expect(result).toMatchObject({ status: 'published' });
      expect(statuses).toEqual(['bundling', 'published']);
      expect(mockAuthFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/api/projects/proj_default/deployments/dep_1/stream',
        ),
        expect.objectContaining({
          headers: { Accept: 'text/event-stream' },
        }),
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
        'https://app.walkeros.io/api/projects/proj_default/flows/cfg_1/configs/cfg_web/deploy',
        { method: 'POST' },
      );
    });

    it('throws with available names when flowName not found', async () => {
      mockGetFlow.mockResolvedValue(multiFlowContent as any);

      await expect(
        deploy({ flowId: 'cfg_1', flowName: 'nonexistent' }),
      ).rejects.toThrow(/Flow "nonexistent" not found. Available: web, server/);
    });

    it('streams SSE when wait=true with flowName', async () => {
      mockGetFlow.mockResolvedValue(multiFlowContent as any);

      // First call: trigger deploy
      mockAuthFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ status: 'bundling', deploymentId: 'dep_1' }),
          { status: 200 },
        ),
      );
      // Second call: SSE stream
      mockAuthFetch.mockResolvedValueOnce(
        new Response(
          createSSEStreamBody([
            {
              event: 'status',
              data: { status: 'bundling', substatus: 'publishing' },
            },
            {
              event: 'status',
              data: {
                status: 'published',
                substatus: null,
                publicUrl: 'https://cdn.example.com/walker.js',
              },
            },
            { event: 'done', data: {} },
          ]),
          {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          },
        ),
      );

      const result = await deploy({
        flowId: 'cfg_1',
        flowName: 'web',
        wait: true,
      });

      expect(result).toMatchObject({ status: 'published' });
      expect(mockAuthFetch).toHaveBeenCalledTimes(2);
      expect(mockAuthFetch).toHaveBeenLastCalledWith(
        expect.stringContaining(
          '/api/projects/proj_default/deployments/dep_1/stream',
        ),
        expect.objectContaining({
          headers: { Accept: 'text/event-stream' },
        }),
      );
    });
  });

  describe('deploy() SSE error handling', () => {
    it('throws on non-ok SSE stream response', async () => {
      mockPost.mockResolvedValue({
        data: { status: 'bundling', deploymentId: 'dep_1' },
      });
      mockAuthFetch.mockResolvedValueOnce(
        new Response('Not found', { status: 404 }),
      );

      await expect(deploy({ flowId: 'cfg_1', wait: true })).rejects.toThrow(
        'Stream failed: 404',
      );
    });

    it('throws when stream ends without terminal status', async () => {
      mockPost.mockResolvedValue({
        data: { status: 'bundling', deploymentId: 'dep_1' },
      });

      // Stream that closes without done event and no status events
      const body = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });
      mockAuthFetch.mockResolvedValueOnce(
        new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        }),
      );

      await expect(deploy({ flowId: 'cfg_1', wait: true })).rejects.toThrow(
        'Stream ended without terminal status',
      );
    });

    it('calls onStatus with substatus', async () => {
      mockPost.mockResolvedValue({
        data: { status: 'bundling', deploymentId: 'dep_1' },
      });
      mockAuthFetch.mockResolvedValueOnce(
        new Response(
          createSSEStreamBody([
            {
              event: 'status',
              data: { status: 'deploying', substatus: 'provisioning' },
            },
            {
              event: 'status',
              data: { status: 'deploying', substatus: 'starting' },
            },
            {
              event: 'status',
              data: {
                status: 'active',
                substatus: null,
                containerUrl: 'https://flow.scw.cloud',
              },
            },
            { event: 'done', data: {} },
          ]),
          {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          },
        ),
      );

      const calls: Array<[string, string | null]> = [];
      await deploy({
        flowId: 'cfg_1',
        wait: true,
        onStatus: (status, substatus) => calls.push([status, substatus]),
      });

      expect(calls).toEqual([
        ['deploying', 'provisioning'],
        ['deploying', 'starting'],
        ['active', null],
      ]);
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
        'https://app.walkeros.io/api/projects/proj_default/flows/cfg_1/configs/cfg_web/deploy',
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
