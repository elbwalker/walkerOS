import type { PipelineOptions } from '../../../commands/run/pipeline.js';

// Mock all runtime modules
jest.mock('../../../runtime/health-server.js', () => ({
  createHealthServer: jest.fn().mockResolvedValue({
    server: {},
    setFlowHandler: jest.fn(),
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

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  scope: jest.fn().mockReturnThis(),
};

describe('runPipeline', () => {
  let runPipeline: typeof import('../../../commands/run/pipeline.js').runPipeline;
  let originalProcessOn: typeof process.on;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Prevent actual signal handlers and process.exit
    originalProcessOn = process.on;
    process.on = jest.fn() as any;
    // Dynamic import to get fresh module with mocks
    const mod = await import('../../../commands/run/pipeline.js');
    runPipeline = mod.runPipeline;
  });

  afterEach(() => {
    process.on = originalProcessOn;
  });

  const baseOptions: PipelineOptions = {
    bundlePath: '/tmp/test-bundle.mjs',
    port: 8080,
    logger: mockLogger as any,
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
    );
    expect(createHeartbeat).not.toHaveBeenCalled();
    expect(createPoller).not.toHaveBeenCalled();
    expect(fetchSecrets).not.toHaveBeenCalled();

    // Registers signal handlers
    expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
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

  it('closes health server if loadFlow fails', async () => {
    const mockClose = jest.fn().mockResolvedValue(undefined);
    (createHealthServer as jest.Mock).mockResolvedValue({
      server: {},
      setFlowHandler: jest.fn(),
      close: mockClose,
    });
    (loadFlow as jest.Mock).mockRejectedValue(new Error('bad bundle'));

    await expect(runPipeline(baseOptions)).rejects.toThrow('bad bundle');
    expect(mockClose).toHaveBeenCalled();
  });
});
