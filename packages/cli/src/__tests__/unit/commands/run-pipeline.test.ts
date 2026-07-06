import type { PipelineOptions } from '../../../commands/run/pipeline.js';

// Mock all runtime modules
jest.mock('../../../runtime/health-server.js', () => ({
  createHealthServer: jest.fn().mockResolvedValue({
    server: {},
    setFlowHandler: jest.fn(),
    setReady: jest.fn(),
    setFailed: jest.fn(),
    setDegraded: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../../runtime/runner.js', () => ({
  loadFlow: jest.fn().mockResolvedValue({
    collector: { command: jest.fn(), status: undefined },
    file: '/tmp/bundle.mjs',
  }),
  swapFlow: jest.fn().mockResolvedValue({
    collector: { command: jest.fn(), status: undefined },
    file: '/tmp/new-bundle.mjs',
  }),
}));

jest.mock('../../../runtime/heartbeat.js', () => ({
  createHeartbeat: jest.fn().mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    sendOnce: jest.fn(),
    updateConfigVersion: jest.fn(),
  }),
  getInstanceId: jest.fn().mockReturnValue('test-instance'),
}));

jest.mock('../../../runtime/poller.js', () => ({
  createPoller: jest.fn().mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    pollOnce: jest.fn(),
  }),
}));

jest.mock('../../../runtime/secrets-fetcher.js', () => ({
  fetchSecrets: jest.fn().mockResolvedValue({}),
  SecretsHttpError: class extends Error {
    status: number;
    constructor(status: number, text: string) {
      super(`${status} ${text}`);
      this.status = status;
    }
  },
}));

jest.mock('../../../runtime/cache.js', () => ({
  writeCache: jest.fn(),
}));

jest.mock('../../../version.js', () => ({ VERSION: '0.0.0-test' }));

import { createHealthServer } from '../../../runtime/health-server.js';
import { loadFlow } from '../../../runtime/runner.js';
import { createHeartbeat } from '../../../runtime/heartbeat.js';
import { createPoller } from '../../../runtime/poller.js';
import { fetchSecrets } from '../../../runtime/secrets-fetcher.js';
import { createMockLogger } from '../../helpers/mock-logger.js';

const mockLogger = createMockLogger();

describe('runPipeline', () => {
  let runPipeline: typeof import('../../../commands/run/pipeline.js').runPipeline;
  let resetProcessGuardsForTest: typeof import('../../../commands/run/pipeline.js').resetProcessGuardsForTest;
  let processOnMock: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Prevent actual signal handlers and process.exit; spyOn keeps the real
    // signature so .mock.calls / .mock.invocationCallOrder stay typed.
    processOnMock = jest.spyOn(process, 'on').mockReturnValue(process);
    // Dynamic import to get fresh module with mocks
    const mod = await import('../../../commands/run/pipeline.js');
    runPipeline = mod.runPipeline;
    resetProcessGuardsForTest = mod.resetProcessGuardsForTest;
    // The guard latch is module-global and survives across tests in this file;
    // reset it so each runPipeline registers its guards fresh.
    resetProcessGuardsForTest();
  });

  afterEach(() => {
    processOnMock.mockRestore();
  });

  const baseOptions: PipelineOptions = {
    bundlePath: '/tmp/test-bundle.mjs',
    port: 8080,
    logger: mockLogger,
  };

  it('creates health server and loads flow in standalone mode', async () => {
    const promise = runPipeline(baseOptions);

    // Let microtasks settle
    await new Promise((r) => setTimeout(r, 50));

    expect(createHealthServer).toHaveBeenCalledWith(8080, mockLogger);
    expect(loadFlow).toHaveBeenCalledWith(
      '/tmp/test-bundle.mjs',
      { port: 8080 },
      mockLogger,
      undefined,
      expect.any(Object), // healthServer
      undefined, // observers (no env vars set)
      undefined, // observeLevel supplier (gated on the observers)
    );
    expect(createHeartbeat).not.toHaveBeenCalled();
    expect(createPoller).not.toHaveBeenCalled();
    expect(fetchSecrets).not.toHaveBeenCalled();

    // Registers signal handlers
    expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
  });

  it('registers the process error guards BEFORE the health server and flow load', async () => {
    // The net must be up before any construction (health server, flow load,
    // openWriter) so an init-window stray emit lands in the guard instead of
    // crashing the container. process.on is mocked here, so the guard's
    // registration of 'uncaughtException' is captured and we can compare call
    // order against the health-server/load-flow mocks. This is the first test
    // to drive runPipeline, so the one-shot guard latch still registers fresh.
    runPipeline(baseOptions);
    await new Promise((r) => setTimeout(r, 50));

    const guardCall = processOnMock.mock.calls.findIndex(
      ([event]) => event === 'uncaughtException',
    );
    expect(guardCall).toBeGreaterThanOrEqual(0);
    const guardOrder = processOnMock.mock.invocationCallOrder[guardCall];

    const healthMock = jest.mocked(createHealthServer);
    const loadMock = jest.mocked(loadFlow);
    const healthOrder = healthMock.mock.invocationCallOrder[0];
    const loadOrder = loadMock.mock.invocationCallOrder[0];

    expect(guardOrder).toBeLessThan(healthOrder);
    expect(guardOrder).toBeLessThan(loadOrder);
  });

  it('auto-degrades /ready after a sustained out-of-band error loop, not a single stray', async () => {
    const mockSetDegraded = jest.fn();
    (createHealthServer as jest.Mock).mockResolvedValue({
      server: {},
      setFlowHandler: jest.fn(),
      setReady: jest.fn(),
      setFailed: jest.fn(),
      setDegraded: mockSetDegraded,
      close: jest.fn().mockResolvedValue(undefined),
    });

    runPipeline(baseOptions);
    await new Promise((r) => setTimeout(r, 50));

    // Extract the guard's uncaughtException listener that runPipeline registered.
    const guardEntry = processOnMock.mock.calls.find(
      ([event]) => event === 'uncaughtException',
    );
    expect(guardEntry).toBeDefined();
    const guard = guardEntry?.[1];
    expect(typeof guard).toBe('function');
    if (typeof guard !== 'function') throw new Error('guard not a function');

    // A single stray error self-heals (stays 200).
    guard(new Error('stray'));
    expect(mockSetDegraded).not.toHaveBeenCalled();

    // Four more within the window cross the threshold (5) and degrade.
    guard(new Error('e2'));
    guard(new Error('e3'));
    guard(new Error('e4'));
    expect(mockSetDegraded).not.toHaveBeenCalled();
    guard(new Error('e5'));
    expect(mockSetDegraded).toHaveBeenCalledTimes(1);
    expect(mockSetDegraded).toHaveBeenCalledWith('out-of-band error loop');
  });

  it('enables heartbeat, poller, and secrets when api config provided', async () => {
    const apiOptions: PipelineOptions = {
      ...baseOptions,
      api: {
        appUrl: 'https://app.walkeros.io',
        token: 'test-token',
        projectId: 'proj_123',
        flowId: 'flow_456',
        heartbeatIntervalMs: 60000,
        pollIntervalMs: 30000,
        cacheDir: '/tmp/cache',
        prepareBundleForRun: jest.fn().mockResolvedValue({
          bundlePath: '/tmp/new-bundle.mjs',
          cleanup: jest.fn().mockResolvedValue(undefined),
        }),
      },
    };

    const promise = runPipeline(apiOptions);
    await new Promise((r) => setTimeout(r, 50));

    expect(fetchSecrets).toHaveBeenCalledWith({
      appUrl: 'https://app.walkeros.io',
      token: 'test-token',
      projectId: 'proj_123',
      flowId: 'flow_456',
    });
    expect(createHeartbeat).toHaveBeenCalledWith(
      expect.objectContaining({
        appUrl: 'https://app.walkeros.io',
        token: 'test-token',
        projectId: 'proj_123',
        flowId: 'flow_456',
        intervalMs: 60000,
      }),
      mockLogger,
    );
    expect(createPoller).toHaveBeenCalledWith(
      expect.objectContaining({
        intervalMs: 30000,
      }),
      mockLogger,
    );
  });

  it('marks readiness failed and closes health server if loadFlow fails', async () => {
    const mockClose = jest.fn().mockResolvedValue(undefined);
    const mockSetFailed = jest.fn();
    const mockSetReady = jest.fn();
    (createHealthServer as jest.Mock).mockResolvedValue({
      server: {},
      setFlowHandler: jest.fn(),
      setReady: mockSetReady,
      setFailed: mockSetFailed,
      close: mockClose,
    });
    (loadFlow as jest.Mock).mockRejectedValue(new Error('bad bundle'));

    await expect(runPipeline(baseOptions)).rejects.toThrow('bad bundle');
    // Fail-fast: /ready must not flip to 200 when construction fails.
    expect(mockSetFailed).toHaveBeenCalledWith('bad bundle');
    expect(mockSetReady).not.toHaveBeenCalledWith(true);
    expect(mockClose).toHaveBeenCalled();
  });
});
