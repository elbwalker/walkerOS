/**
 * Telemetry wiring tests for the runtime pipeline.
 *
 * The pipeline reads WALKEROS_OBSERVER_URL (the observer base) +
 * WALKEROS_INGEST_TOKEN + WALKEROS_DEPLOYMENT_ID at boot and (when all are
 * present) builds a single-element observer array via createBatchedPoster
 * (POSTing to `${base}/ingest/${deploymentId}`) + createTelemetryObserver,
 * then forwards it to loadFlow as the 6th argument. When any of those env
 * vars is missing, no observers are passed (the bundle sees undefined and
 * skips the install loop).
 *
 * The active trace window arrives via the trace-poller, which writes the
 * shared `traceUntil` holder in @walkeros/core; the pipeline supplier reads
 * it per emit.
 */
import { setTraceUntil } from '@walkeros/core';
import type { PipelineOptions } from '../../../commands/run/pipeline.js';

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

describe('runPipeline telemetry wiring', () => {
  let originalProcessOn: typeof process.on;
  let runPipeline: typeof import('../../../commands/run/pipeline.js').runPipeline;

  beforeEach(async () => {
    jest.clearAllMocks();
    originalProcessOn = process.on;
    process.on = jest.fn() as never;
    delete process.env.WALKEROS_OBSERVER_URL;
    delete process.env.WALKEROS_INGEST_TOKEN;
    delete process.env.WALKEROS_DEPLOYMENT_ID;
    setTraceUntil(null);
    const mod = await import('../../../commands/run/pipeline.js');
    runPipeline = mod.runPipeline;
  });

  afterEach(() => {
    process.on = originalProcessOn;
    delete process.env.WALKEROS_OBSERVER_URL;
    delete process.env.WALKEROS_INGEST_TOKEN;
    delete process.env.WALKEROS_DEPLOYMENT_ID;
    setTraceUntil(null);
  });

  const baseOptions: PipelineOptions = {
    bundlePath: '/tmp/test-bundle.mjs',
    port: 8080,
    logger: mockLogger as never,
  };

  it('passes a single-element observer array when WALKEROS_OBSERVER_URL, WALKEROS_INGEST_TOKEN, and WALKEROS_DEPLOYMENT_ID are set', async () => {
    process.env.WALKEROS_OBSERVER_URL = 'https://observer.example.com';
    process.env.WALKEROS_INGEST_TOKEN = 'tok_test';
    process.env.WALKEROS_DEPLOYMENT_ID = 'dep_42';

    void runPipeline(baseOptions);
    await waitFor(() => (loadFlow as jest.Mock).mock.calls.length > 0);

    const call = (loadFlow as jest.Mock).mock.calls[0];
    const passed = call[5];
    expect(Array.isArray(passed)).toBe(true);
    expect(passed).toHaveLength(1);
    expect(typeof passed[0]).toBe('function');
  });

  it('passes undefined observers when WALKEROS_OBSERVER_URL is missing', async () => {
    process.env.WALKEROS_INGEST_TOKEN = 'tok_test';
    process.env.WALKEROS_DEPLOYMENT_ID = 'dep_42';

    void runPipeline(baseOptions);
    await waitFor(() => (loadFlow as jest.Mock).mock.calls.length > 0);

    const call = (loadFlow as jest.Mock).mock.calls[0];
    expect(call[5]).toBeUndefined();
  });

  it('passes undefined observers when WALKEROS_INGEST_TOKEN is missing', async () => {
    process.env.WALKEROS_OBSERVER_URL = 'https://observer.example.com';
    process.env.WALKEROS_DEPLOYMENT_ID = 'dep_42';

    void runPipeline(baseOptions);
    await waitFor(() => (loadFlow as jest.Mock).mock.calls.length > 0);

    const call = (loadFlow as jest.Mock).mock.calls[0];
    expect(call[5]).toBeUndefined();
  });

  it('passes undefined observers when WALKEROS_DEPLOYMENT_ID is missing', async () => {
    process.env.WALKEROS_OBSERVER_URL = 'https://observer.example.com';
    process.env.WALKEROS_INGEST_TOKEN = 'tok_test';

    void runPipeline(baseOptions);
    await waitFor(() => (loadFlow as jest.Mock).mock.calls.length > 0);

    const call = (loadFlow as jest.Mock).mock.calls[0];
    expect(call[5]).toBeUndefined();
  });

  it('still loads the flow when telemetry is disabled (no env)', async () => {
    void runPipeline(baseOptions);
    await waitFor(() => (loadFlow as jest.Mock).mock.calls.length > 0);

    expect(loadFlow).toHaveBeenCalledTimes(1);
    const call = (loadFlow as jest.Mock).mock.calls[0];
    expect(call[5]).toBeUndefined();
  });
});
