import {
  deployAuthenticatedFetch,
  requireProjectId,
  resolveBaseUrl,
} from '../../../core/auth.js';
import { startHeartbeat } from '../../../commands/run/heartbeat.js';

jest.mock('../../../core/auth.js', () => ({
  ...jest.requireActual('../../../core/auth.js'),
  requireProjectId: jest.fn().mockReturnValue('proj_default'),
  resolveBaseUrl: jest.fn().mockReturnValue('https://app.walkeros.io'),
  deployAuthenticatedFetch: jest.fn(),
}));

jest.mock('../../../version.js', () => ({ VERSION: '2.0.0-test' }));

const mockLoggerInstance: Record<string, jest.Mock> = {};

jest.mock('../../../core/cli-logger.js', () => ({
  createCLILogger: jest.fn().mockImplementation(() => mockLoggerInstance),
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('test-uuid-1234'),
}));

const mockAuthenticatedFetch = jest.mocked(deployAuthenticatedFetch);

// Helper: advance timers and flush async callbacks
async function advanceAndFlush(ms: number) {
  jest.advanceTimersByTime(ms);
  // Flush microtask queue so async interval callback settles
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('startHeartbeat', () => {
  let cleanupFn: (() => Promise<void>) | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    cleanupFn = undefined;
    // Reset logger methods
    mockLoggerInstance.info = jest.fn();
    mockLoggerInstance.warn = jest.fn();
    mockLoggerInstance.error = jest.fn();
    mockLoggerInstance.debug = jest.fn();
  });

  afterEach(async () => {
    if (cleanupFn) {
      mockAuthenticatedFetch.mockResolvedValue(
        new Response('{}', { status: 200 }),
      );
      await cleanupFn();
    }
    jest.useRealTimers();
  });

  const defaultOptions = {
    deployment: 'my-deploy',
    url: 'https://my-server.example.com',
    mode: 'collect' as const,
  };

  function mockInitResponse(overrides?: Record<string, unknown>) {
    return new Response(
      JSON.stringify({
        ack: true,
        deploymentId: 'dep_abc123',
        action: 'none',
        ...overrides,
      }),
      { status: 200 },
    );
  }

  describe('initial heartbeat (registration)', () => {
    it('sends POST with url, healthEndpoint, instanceId, cliVersion, and mode', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce(mockInitResponse());

      const result = await startHeartbeat(defaultOptions);
      cleanupFn = result.cleanup;

      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'https://app.walkeros.io/api/projects/proj_default/deployments/my-deploy/heartbeat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: 'https://my-server.example.com',
            healthEndpoint: '/health',
            instanceId: 'test-uuid-1234',
            cliVersion: '2.0.0-test',
            mode: 'collect',
          }),
        },
      );
    });

    it('returns instanceId and deploymentId', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce(mockInitResponse());

      const result = await startHeartbeat(defaultOptions);
      cleanupFn = result.cleanup;

      expect(result.instanceId).toBe('test-uuid-1234');
      expect(result.deploymentId).toBe('dep_abc123');
    });

    it('uses custom projectId when provided', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce(mockInitResponse());

      const result = await startHeartbeat({
        ...defaultOptions,
        projectId: 'proj_custom',
      });
      cleanupFn = result.cleanup;

      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'https://app.walkeros.io/api/projects/proj_custom/deployments/my-deploy/heartbeat',
        expect.any(Object),
      );
    });

    it('uses custom healthEndpoint when provided', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce(mockInitResponse());

      const result = await startHeartbeat({
        ...defaultOptions,
        healthEndpoint: '/healthz',
      });
      cleanupFn = result.cleanup;

      const body = JSON.parse(
        (mockAuthenticatedFetch.mock.calls[0]![1] as RequestInit)
          .body as string,
      );
      expect(body.healthEndpoint).toBe('/healthz');
    });

    it('throws on non-ok response with error message', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { message: 'Deployment not found' } }),
          { status: 404 },
        ),
      );

      await expect(startHeartbeat(defaultOptions)).rejects.toThrow(
        'Deployment not found',
      );
    });

    it('throws generic message when error response has no message', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce(
        new Response('{}', { status: 500 }),
      );

      await expect(startHeartbeat(defaultOptions)).rejects.toThrow(
        'Initial heartbeat failed (500)',
      );
    });
  });

  describe('heartbeat loop', () => {
    it('sends ongoing heartbeat at the configured interval', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce(mockInitResponse());

      const result = await startHeartbeat({
        ...defaultOptions,
        heartbeatInterval: 30,
      });
      cleanupFn = result.cleanup;

      mockAuthenticatedFetch.mockClear();
      mockAuthenticatedFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ action: 'none' }), { status: 200 }),
      );

      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(
        (mockAuthenticatedFetch.mock.calls[0]![1] as RequestInit)
          .body as string,
      );
      expect(body.instanceId).toBe('test-uuid-1234');
      expect(typeof body.uptime).toBe('number');
      expect(body.cliVersion).toBe('2.0.0-test');
    });

    it('handles action "update" by logging the bundle URL', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce(mockInitResponse());

      const result = await startHeartbeat(defaultOptions);
      cleanupFn = result.cleanup;

      mockAuthenticatedFetch.mockClear();
      mockAuthenticatedFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            action: 'update',
            versionNumber: 3,
            bundleUrl: 'https://cdn.example.com/bundle-v3.js',
          }),
          { status: 200 },
        ),
      );

      jest.advanceTimersByTime(60_000);
      // Flush microtasks: interval fires -> await fetch -> await resp.json() -> log.info
      for (let i = 0; i < 10; i++) await Promise.resolve();

      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        expect.stringContaining('https://cdn.example.com/bundle-v3.js'),
      );
    });
  });

  describe('cleanup on error', () => {
    it('heartbeat failure does not crash', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce(mockInitResponse());

      const result = await startHeartbeat(defaultOptions);
      cleanupFn = result.cleanup;

      mockAuthenticatedFetch.mockClear();
      mockAuthenticatedFetch.mockRejectedValueOnce(
        new Error('Network failure'),
      );

      jest.advanceTimersByTime(60_000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        expect.stringContaining('Network failure'),
      );
    });

    it('cleanup clears the interval and sends shutdown heartbeat', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce(mockInitResponse());

      const result = await startHeartbeat(defaultOptions);

      mockAuthenticatedFetch.mockClear();
      mockAuthenticatedFetch.mockResolvedValueOnce(
        new Response('{}', { status: 200 }),
      );

      await result.cleanup();
      cleanupFn = undefined; // already cleaned up

      expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(
        (mockAuthenticatedFetch.mock.calls[0]![1] as RequestInit)
          .body as string,
      );
      expect(body.instanceId).toBe('test-uuid-1234');
      expect(body.shutting_down).toBe(true);
    });

    it('cleanup handles fetch errors gracefully', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce(mockInitResponse());

      const result = await startHeartbeat(defaultOptions);

      mockAuthenticatedFetch.mockClear();
      mockAuthenticatedFetch.mockRejectedValueOnce(
        new Error('Connection refused'),
      );

      await expect(result.cleanup()).resolves.toBeUndefined();
      cleanupFn = undefined; // already cleaned up
    });
  });
});
