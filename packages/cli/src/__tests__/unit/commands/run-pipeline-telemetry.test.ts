/**
 * Phase 5 telemetry wiring tests for the runtime pipeline.
 *
 * The pipeline reads WALKEROS_OBSERVER_URL + WALKEROS_INGEST_TOKEN at boot
 * and (when both are present) builds a hooks bag via
 * createBatchedPoster + createTelemetryHooks, then forwards it to loadFlow
 * as the new 6th argument. When either env var is missing, no hooks are
 * passed (the bundle sees undefined and skips the merge).
 *
 * The WALKEROS_TRACE_UNTIL override is exercised at the resolver layer; the
 * pipeline only forwards what the resolver returns.
 */
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
    delete process.env.WALKEROS_TRACE_UNTIL;
    const mod = await import('../../../commands/run/pipeline.js');
    runPipeline = mod.runPipeline;
  });

  afterEach(() => {
    process.on = originalProcessOn;
    delete process.env.WALKEROS_OBSERVER_URL;
    delete process.env.WALKEROS_INGEST_TOKEN;
    delete process.env.WALKEROS_TRACE_UNTIL;
  });

  const baseOptions: PipelineOptions = {
    bundlePath: '/tmp/test-bundle.mjs',
    port: 8080,
    logger: mockLogger as never,
  };

  it('passes telemetry hooks when WALKEROS_OBSERVER_URL and WALKEROS_INGEST_TOKEN are set', async () => {
    process.env.WALKEROS_OBSERVER_URL =
      'https://observer.example.com/ingest/dep_42';
    process.env.WALKEROS_INGEST_TOKEN = 'tok_test';

    void runPipeline(baseOptions);
    await new Promise((r) => setTimeout(r, 30));

    const call = (loadFlow as jest.Mock).mock.calls[0];
    const passedHooks = call[5];
    expect(passedHooks).toBeDefined();
    expect(typeof passedHooks).toBe('object');
    // The standard hooks bag wires prePush / postPush (collector hop) plus
    // destination + transformer pairs. Check the canonical collector pair.
    expect(passedHooks.prePush).toBeInstanceOf(Function);
    expect(passedHooks.postPush).toBeInstanceOf(Function);
  });

  it('passes undefined hooks when WALKEROS_OBSERVER_URL is missing', async () => {
    process.env.WALKEROS_INGEST_TOKEN = 'tok_test';

    void runPipeline(baseOptions);
    await new Promise((r) => setTimeout(r, 30));

    const call = (loadFlow as jest.Mock).mock.calls[0];
    expect(call[5]).toBeUndefined();
  });

  it('passes undefined hooks when WALKEROS_INGEST_TOKEN is missing', async () => {
    process.env.WALKEROS_OBSERVER_URL =
      'https://observer.example.com/ingest/dep_42';

    void runPipeline(baseOptions);
    await new Promise((r) => setTimeout(r, 30));

    const call = (loadFlow as jest.Mock).mock.calls[0];
    expect(call[5]).toBeUndefined();
  });

  it('still loads the flow when telemetry is disabled (no env)', async () => {
    void runPipeline(baseOptions);
    await new Promise((r) => setTimeout(r, 30));

    expect(loadFlow).toHaveBeenCalledTimes(1);
    const call = (loadFlow as jest.Mock).mock.calls[0];
    expect(call[5]).toBeUndefined();
  });
});
