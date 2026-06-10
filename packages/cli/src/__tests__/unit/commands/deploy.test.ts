import { requireProjectId } from '../../../core/auth.js';
import { apiFetch } from '../../../core/http.js';
import { getFlow } from '../../../commands/flows/index.js';
import {
  deploy,
  getDeployment,
  streamDeploymentStatus,
  renderStatusLabel,
  DEFAULT_DEPLOY_WAIT_MS,
} from '../../../commands/deploy/index.js';
import { setupMockApiClient } from '../../helpers/mock-api-client.js';

jest.mock('../../../core/api-client.js');
jest.mock('../../../core/auth.js', () => ({
  ...jest.requireActual('../../../core/auth.js'),
  requireProjectId: jest.fn().mockReturnValue('proj_default'),
}));
jest.mock('../../../core/http.js', () => ({
  apiFetch: jest.fn(),
}));
jest.mock('../../../commands/flows/index.js', () => ({
  getFlow: jest.fn(),
}));

const { GET: mockGet, POST: mockPost } = setupMockApiClient();

const mockGetFlow = jest.mocked(getFlow);
const mockApiFetch = jest.mocked(apiFetch);

const multiFlowContent = {
  config: {
    flows: {
      web: { web: {} },
      server: { server: {} },
    },
  },
  settings: [
    { id: 'cfg_web', name: 'web', platform: 'web' },
    { id: 'cfg_server', name: 'server', platform: 'server' },
  ],
};

/** Read the Idempotency-Key from a recorded request-init argument. */
function idempotencyKeyFromHeaders(init: unknown): string {
  if (init && typeof init === 'object' && 'headers' in init) {
    const headers = (init as { headers?: Record<string, string> }).headers;
    return headers?.['Idempotency-Key'] ?? '';
  }
  return '';
}

/** Read the AbortSignal from a recorded request-init argument. */
function signalFromInit(init: unknown): AbortSignal | undefined {
  if (init && typeof init === 'object' && 'signal' in init) {
    return (init as { signal?: AbortSignal }).signal;
  }
  return undefined;
}

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
        data: { status: 'deploying', deploymentId: 'dep_1' },
      });
      await deploy({ flowId: 'cfg_1', wait: false });
      expect(mockPost).toHaveBeenCalledWith(
        '/api/projects/{projectId}/flows/{flowId}/deploy',
        expect.objectContaining({
          params: { path: { projectId: 'proj_default', flowId: 'cfg_1' } },
          headers: { 'Idempotency-Key': expect.any(String) },
        }),
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
        data: { status: 'deploying', deploymentId: 'dep_1' },
      });

      // SSE stream response
      mockApiFetch.mockResolvedValueOnce(
        new Response(
          createSSEStreamBody([
            {
              event: 'status',
              data: { status: 'deploying', substatus: 'building' },
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
      expect(statuses).toEqual(['deploying', 'published']);
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_default/deployments/dep_1/stream',
        expect.objectContaining({
          headers: { Accept: 'text/event-stream' },
        }),
      );
    });
  });

  describe('deploy() with flowName', () => {
    it('resolves settingsId and calls per-settings route', async () => {
      mockGetFlow.mockResolvedValue(multiFlowContent as any);
      mockApiFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ status: 'deploying', deploymentId: 'dep_1' }),
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
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_default/flows/cfg_1/settings/cfg_web/deploy',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Idempotency-Key': expect.any(String) },
        }),
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
      mockApiFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ status: 'deploying', deploymentId: 'dep_1' }),
          { status: 200 },
        ),
      );
      // Second call: SSE stream
      mockApiFetch.mockResolvedValueOnce(
        new Response(
          createSSEStreamBody([
            {
              event: 'status',
              data: { status: 'deploying', substatus: 'publishing' },
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
      expect(mockApiFetch).toHaveBeenCalledTimes(2);
      expect(mockApiFetch).toHaveBeenLastCalledWith(
        '/api/projects/proj_default/deployments/dep_1/stream',
        expect.objectContaining({
          headers: { Accept: 'text/event-stream' },
        }),
      );
    });
  });

  describe('deploy() SSE error handling', () => {
    it('throws on non-ok SSE stream response', async () => {
      mockPost.mockResolvedValue({
        data: { status: 'deploying', deploymentId: 'dep_1' },
      });
      mockApiFetch.mockResolvedValueOnce(
        new Response('Not found', { status: 404 }),
      );

      await expect(deploy({ flowId: 'cfg_1', wait: true })).rejects.toThrow(
        'Stream failed: 404',
      );
    });

    it('throws when stream ends without terminal status', async () => {
      mockPost.mockResolvedValue({
        data: { status: 'deploying', deploymentId: 'dep_1' },
      });

      // Stream that closes without done event and no status events
      const body = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });
      mockApiFetch.mockResolvedValueOnce(
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
        data: { status: 'deploying', deploymentId: 'dep_1' },
      });
      mockApiFetch.mockResolvedValueOnce(
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

  describe('idempotency key per invocation', () => {
    it('legacy POST sends a fresh unique Idempotency-Key per call', async () => {
      mockPost.mockResolvedValue({
        data: { status: 'deploying', deploymentId: 'dep_1' },
      });

      await deploy({ flowId: 'cfg_1', wait: false });
      await deploy({ flowId: 'cfg_1', wait: false });

      const firstKey = idempotencyKeyFromHeaders(mockPost.mock.calls[0]?.[1]);
      const secondKey = idempotencyKeyFromHeaders(mockPost.mock.calls[1]?.[1]);

      expect(firstKey).toEqual(expect.any(String));
      expect(firstKey.length).toBeGreaterThan(0);
      expect(secondKey).not.toBe(firstKey);
    });

    it('per-settings POST sends a fresh unique Idempotency-Key per call', async () => {
      mockGetFlow.mockResolvedValue(multiFlowContent as any);
      // Fresh Response per call: a Response body can only be read once.
      mockApiFetch
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ status: 'deploying', deploymentId: 'dep_1' }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ status: 'deploying', deploymentId: 'dep_2' }),
            { status: 200 },
          ),
        );

      await deploy({ flowId: 'cfg_1', flowName: 'web', wait: false });
      await deploy({ flowId: 'cfg_1', flowName: 'web', wait: false });

      const firstKey = idempotencyKeyFromHeaders(
        mockApiFetch.mock.calls[0]?.[1],
      );
      const secondKey = idempotencyKeyFromHeaders(
        mockApiFetch.mock.calls[1]?.[1],
      );

      expect(firstKey).toEqual(expect.any(String));
      expect(firstKey.length).toBeGreaterThan(0);
      expect(secondKey).not.toBe(firstKey);
    });
  });

  describe('default wait budget', () => {
    it('defaults to 12 minutes so a healthy long server deploy is not aborted', () => {
      // Server deploy budget is 10 minutes; the client default must exceed it
      // so a slow-but-healthy deploy is never aborted client-side and read as
      // a CI failure.
      expect(DEFAULT_DEPLOY_WAIT_MS).toBe(12 * 60 * 1000);
    });

    it('defaults the stream timeout to cover the full server deploy budget', async () => {
      const body = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });
      mockApiFetch.mockResolvedValueOnce(
        new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        }),
      );

      // Stream ends without terminal status, so it rejects, but the signal
      // passed to apiFetch must carry the 12-minute default budget.
      await expect(
        streamDeploymentStatus('proj_default', 'dep_1', {}),
      ).rejects.toThrow('Stream ended without terminal status');

      const signal = signalFromInit(mockApiFetch.mock.calls[0]?.[1]);
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal?.aborted).toBe(false);
    });

    it('honors an explicit timeout override (the --wait flag)', async () => {
      const body = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });
      mockApiFetch.mockResolvedValueOnce(
        new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        }),
      );

      const explicitSignal = AbortSignal.timeout(30_000);
      await expect(
        streamDeploymentStatus('proj_default', 'dep_1', {
          signal: explicitSignal,
        }),
      ).rejects.toThrow('Stream ended without terminal status');

      const signal = signalFromInit(mockApiFetch.mock.calls[0]?.[1]);
      expect(signal).toBe(explicitSignal);
    });
  });

  describe('renderStatusLabel()', () => {
    // The server's deployment status enum is
    // ['idle', 'deploying', 'published', 'active', 'stopped', 'failed'] and the
    // stream emits these (status, substatus) pairs (see the app's
    // emitDeploymentUpdate calls and the snapshot route). `bundling` is never a
    // status the stream emits; the build phase is `deploying`/`building`.
    const emitted: Array<[string, string | null]> = [
      ['deploying', 'building'],
      ['deploying', 'publishing'],
      ['deploying', 'provisioning'],
      ['deploying', 'starting'],
      ['deploying', null],
      ['published', null],
      ['active', null],
      ['failed', null],
      ['stopped', null],
    ];

    it.each(emitted)(
      'maps emitted status %s/%s to a non-empty human label',
      (status, substatus) => {
        const label = renderStatusLabel(status, substatus);
        expect(label.length).toBeGreaterThan(0);
        // Must never echo the raw enum token as the whole label for a status we
        // claim to recognize; it should be a readable phrase.
        expect(label).not.toBe(status);
      },
    );

    it('falls back to the substatus-less label when only the substatus is unknown', () => {
      expect(renderStatusLabel('deploying', 'unknown-substatus')).toBe(
        renderStatusLabel('deploying', null),
      );
    });

    it('renders a safe fallback for an unknown status instead of nothing', () => {
      const label = renderStatusLabel('totally-unknown', null);
      expect(label.length).toBeGreaterThan(0);
      expect(label).toContain('totally-unknown');
    });

    it('renders a safe fallback for an unknown status with substatus', () => {
      const label = renderStatusLabel('totally-unknown', 'weird');
      expect(label.length).toBeGreaterThan(0);
      expect(label).toContain('totally-unknown');
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
      mockApiFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ id: 'dep_1', type: 'web', status: 'published' }),
          { status: 200 },
        ),
      );

      await getDeployment({ flowId: 'cfg_1', flowName: 'web' });

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/projects/proj_default/flows/cfg_1/settings/cfg_web/deploy',
      );
    });
  });
});
