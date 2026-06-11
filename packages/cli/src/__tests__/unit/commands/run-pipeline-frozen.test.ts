/**
 * Frozen-config run mode tests for the runtime pipeline.
 *
 * `WALKEROS_CONFIG_FROZEN` ('1' or 'true') marks the bundle the pipeline
 * serves as an immutable snapshot: secrets are still injected at boot, but
 * neither the config hot-swap poller nor the heartbeat is constructed.
 * Without the env var, the api-enabled pipeline behaves as before (secrets +
 * heartbeat + poller). The flag value convention matches the package's
 * existing boolean env flags (WALKEROS_TELEMETRY_DISABLED): exactly '1' or
 * 'true' enables it, anything else (including '0') is off.
 */
import type { PipelineOptions } from '../../../commands/run/pipeline.js';

jest.mock('../../../runtime/health-server.js', () => ({
  createHealthServer: jest.fn().mockResolvedValue({
    server: {},
    setFlowHandler: jest.fn(),
    setReady: jest.fn(),
    setFailed: jest.fn(),
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
    file: '/tmp/bundle.mjs',
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

jest.mock('../../../runtime/trace-poller.js', () => ({
  createTracePoller: jest.fn().mockReturnValue({
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

import { loadFlow } from '../../../runtime/runner.js';
import { createHeartbeat } from '../../../runtime/heartbeat.js';
import { createPoller } from '../../../runtime/poller.js';
import { fetchSecrets } from '../../../runtime/secrets-fetcher.js';

async function waitFor(cond: () => boolean, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 5));
  }
}

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  scope: jest.fn().mockReturnThis(),
};

const frozenLogLine = 'Config frozen: hot-swap and heartbeat disabled';

function hasFrozenLog(): boolean {
  return mockLogger.info.mock.calls.some(
    (call) => typeof call[0] === 'string' && call[0].includes(frozenLogLine),
  );
}

describe('runPipeline frozen-config mode', () => {
  let originalProcessOn: typeof process.on;
  let runPipeline: typeof import('../../../commands/run/pipeline.js').runPipeline;

  beforeEach(async () => {
    jest.clearAllMocks();
    originalProcessOn = process.on;
    process.on = jest.fn() as never;
    delete process.env.WALKEROS_CONFIG_FROZEN;
    delete process.env.WALKEROS_OBSERVER_URL;
    delete process.env.WALKEROS_INGEST_TOKEN;
    delete process.env.WALKEROS_DEPLOYMENT_ID;
    delete process.env.WALKEROS_OBSERVE_LEVEL;
    const mod = await import('../../../commands/run/pipeline.js');
    runPipeline = mod.runPipeline;
  });

  afterEach(() => {
    process.on = originalProcessOn;
    delete process.env.WALKEROS_CONFIG_FROZEN;
  });

  const baseOptions: PipelineOptions = {
    bundlePath: '/tmp/test-bundle.mjs',
    port: 8080,
    logger: mockLogger as never,
  };

  const makeApiOptions = (): PipelineOptions => ({
    ...baseOptions,
    api: {
      appUrl: 'https://app.walkeros.io',
      token: 'test-token',
      projectId: 'proj_123',
      flowId: 'flow_456',
      deploymentId: 'dep_789',
      heartbeatIntervalMs: 60000,
      pollIntervalMs: 30000,
      cacheDir: '/tmp/cache',
      prepareBundleForRun: jest.fn().mockResolvedValue({
        bundlePath: '/tmp/new-bundle.mjs',
        cleanup: jest.fn().mockResolvedValue(undefined),
      }),
    },
  });

  it('frozen=1 with full api: injects secrets at boot but constructs neither heartbeat nor poller', async () => {
    process.env.WALKEROS_CONFIG_FROZEN = '1';

    void runPipeline(makeApiOptions());
    await waitFor(() => hasFrozenLog());

    expect(fetchSecrets).toHaveBeenCalledWith({
      appUrl: 'https://app.walkeros.io',
      token: 'test-token',
      projectId: 'proj_123',
      flowId: 'flow_456',
    });
    expect(loadFlow).toHaveBeenCalledTimes(1);
    expect(createHeartbeat).not.toHaveBeenCalled();
    expect(createPoller).not.toHaveBeenCalled();
  });

  it("frozen='true' with full api: also disables heartbeat and poller", async () => {
    process.env.WALKEROS_CONFIG_FROZEN = 'true';

    void runPipeline(makeApiOptions());
    await waitFor(() => hasFrozenLog());

    expect(createHeartbeat).not.toHaveBeenCalled();
    expect(createPoller).not.toHaveBeenCalled();
  });

  it('without the env var, the api pipeline behaves as today: secrets + heartbeat + poller', async () => {
    void runPipeline(makeApiOptions());
    await waitFor(
      () =>
        jest.mocked(createHeartbeat).mock.calls.length > 0 &&
        jest.mocked(createPoller).mock.calls.length > 0,
    );

    expect(fetchSecrets).toHaveBeenCalled();
    expect(createHeartbeat).toHaveBeenCalledWith(
      expect.objectContaining({ intervalMs: 60000 }),
      mockLogger,
    );
    expect(createPoller).toHaveBeenCalledWith(
      expect.objectContaining({ intervalMs: 30000 }),
      mockLogger,
    );
    expect(hasFrozenLog()).toBe(false);
  });

  it("frozen='0' is NOT frozen: heartbeat and poller start", async () => {
    process.env.WALKEROS_CONFIG_FROZEN = '0';

    void runPipeline(makeApiOptions());
    await waitFor(
      () =>
        jest.mocked(createHeartbeat).mock.calls.length > 0 &&
        jest.mocked(createPoller).mock.calls.length > 0,
    );

    expect(hasFrozenLog()).toBe(false);
  });

  it('frozen=1 without api: standalone run unchanged, frozen line still logged for self-explanatory logs', async () => {
    process.env.WALKEROS_CONFIG_FROZEN = '1';

    void runPipeline(baseOptions);
    await waitFor(() => hasFrozenLog());

    expect(loadFlow).toHaveBeenCalledTimes(1);
    expect(fetchSecrets).not.toHaveBeenCalled();
    expect(createHeartbeat).not.toHaveBeenCalled();
    expect(createPoller).not.toHaveBeenCalled();
  });
});
